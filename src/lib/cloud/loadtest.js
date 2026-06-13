// Traffic / capacity simulator for Ground0: Cloud — Architecture Studio.
//
// runLoadTest({ nodes, edges }, { rps }) pushes a target request rate through
// the architecture, computes how loaded each tier is, finds the bottleneck,
// estimates success rate + latency, and proposes scaling fixes (most as
// one-click config patches). The goal is to let a beginner *feel* what happens
// when traffic 100×'s — and learn how to scale out of it.
import {
  instanceRps, dbQps, nextType, nextDbClass,
  CACHE_HIT_RATIO, CDN_OFFLOAD, BASE_LATENCY_MS, fmtRps,
} from './specs.js'

const MANAGED_CAPACITY = 1e9 // managed services we treat as effectively elastic

// Ordered node-id path from the internet entry to the deepest data tier
// (falls back to the farthest reachable node).
function mainPath(nodes, edges) {
  const out = {}
  nodes.forEach((n) => (out[n.id] = []))
  edges.forEach((e) => out[e.from] && out[e.to] && out[e.from].push(e.to))
  const entry = nodes.find((n) => n.kind === 'internet')
  if (!entry) return null
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const prev = {}
  const dist = { [entry.id]: 0 }
  const queue = [entry.id]
  while (queue.length) {
    const id = queue.shift()
    for (const to of out[id]) {
      if (dist[to] === undefined) {
        dist[to] = dist[id] + 1
        prev[to] = id
        queue.push(to)
      }
    }
  }
  const reachable = Object.keys(dist).filter((id) => id !== entry.id)
  if (!reachable.length) return null
  const data = reachable.filter((id) => byId[id].kind === 'database')
  const pool = data.length ? data : reachable
  const target = pool.sort((a, b) => dist[b] - dist[a])[0]
  const path = [target]
  let cur = target
  while (prev[cur] !== undefined) {
    cur = prev[cur]
    path.unshift(cur)
  }
  return path.map((id) => byId[id])
}

function capacityOf(node, incoming) {
  const c = node.config || {}
  if (node.kind === 'compute' || node.kind === 'container') {
    const per = instanceRps(c.instanceType)
    const base = c.instances || 1
    const max = c.autoScale ? c.maxInstances || base : base
    const scaled = c.autoScale ? Math.min(max, Math.max(base, Math.ceil(incoming / per))) : base
    return { capacity: per * scaled, scaledInstances: scaled, ceiling: per * max, scalable: false }
  }
  if (node.kind === 'database') {
    // DynamoDB (on-demand) scales itself; relational DBs have a fixed ceiling.
    if (node.type === 'dynamodb') return { capacity: MANAGED_CAPACITY, scalable: true }
    const cap = dbQps(c.dbClass) * (1 + 0.8 * (c.readReplicas || 0))
    return { capacity: cap, scalable: false }
  }
  if (node.kind === 'cache') return { capacity: 250000, scalable: false }
  // serverless + managed edge/data services we treat as effectively elastic.
  return { capacity: MANAGED_CAPACITY, scalable: true }
}

export function runLoadTest({ nodes = [], edges = [] }, { rps = 1000 } = {}) {
  const path = mainPath(nodes, edges)
  if (!path) {
    return { ok: false, reason: 'Connect a "Users / Internet" node to your system, then run the test.' }
  }
  // A cache offloads DB reads if the app tier talks to it — whether it sits
  // in-line on the path or as a sibling of the database.
  const pathIds = new Set(path.map((n) => n.id))
  const cacheBacked = nodes.some((n) => n.kind === 'cache' && edges.some((e) => e.to === n.id && pathIds.has(e.from)))

  let load = rps
  let cacheApplied = false
  const tiers = []
  const instanceCounts = {}
  for (const node of path) {
    if (node.kind === 'internet') continue
    let incoming = load
    if (node.kind === 'database' && cacheBacked && !cacheApplied) incoming = load * (1 - CACHE_HIT_RATIO)
    const cap = capacityOf(node, incoming)
    const util = incoming / cap.capacity
    if (cap.scaledInstances) instanceCounts[node.id] = cap.scaledInstances
    tiers.push({
      id: node.id,
      name: node.label || node.name,
      icon: node.icon,
      kind: node.kind,
      incoming: Math.round(incoming),
      capacity: Math.round(cap.capacity),
      util,
      scaledInstances: cap.scaledInstances,
      scalable: cap.scalable,
      node,
    })
    // What flows on to the next tier.
    if (node.kind === 'cdn') load *= 1 - CDN_OFFLOAD
    else if (node.kind === 'cache') { load *= 1 - CACHE_HIT_RATIO; cacheApplied = true }
  }

  // Bottleneck = busiest non-elastic tier.
  const constrained = tiers.filter((t) => !t.scalable)
  const bottleneck = constrained.length ? constrained.reduce((a, b) => (b.util > a.util ? b : a)) : null
  const maxUtil = bottleneck ? bottleneck.util : 0

  let status, successRate, latencyMs, overloaded
  if (maxUtil <= 0.7) {
    status = 'Healthy'
    successRate = 1
    latencyMs = Math.round(BASE_LATENCY_MS + maxUtil * 25)
    overloaded = false
  } else if (maxUtil <= 1) {
    status = 'Degraded'
    successRate = 1
    latencyMs = Math.round(Math.min(1500, BASE_LATENCY_MS / (1.02 - maxUtil)))
    overloaded = false
  } else {
    status = 'Overloaded'
    successRate = 1 / maxUtil
    latencyMs = null // timeouts
    overloaded = true
  }

  return {
    ok: true,
    rps,
    servedRps: Math.round(rps * successRate),
    successRate,
    latencyMs,
    overloaded,
    status,
    hasCache: cacheBacked,
    bottleneck: bottleneck ? { id: bottleneck.id, name: bottleneck.name } : null,
    tiers,
    instanceCounts,
    recommendations: recommend(bottleneck, cacheBacked, maxUtil),
  }
}

// ── Load-flow visualisation on the design board ──────────────────────
// Turns a load test into an animatable sequence: a request travels the path,
// each tier coloured by utilisation (green ok · amber hot · red OVERFLOW), and
// the connection BREAKS (red X) at the first saturated tier with a fix hint.
const edgeBetween = (edges, a, b) => edges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a))

export function buildLoadFlow({ nodes = [], edges = [] }, { rps = 1000 } = {}) {
  const result = runLoadTest({ nodes, edges }, { rps })
  if (!result.ok) return { ok: false, reason: result.reason, steps: [], nodeStatus: {} }

  const entry = nodes.find((n) => n.kind === 'internet')
  const levelOf = (t) => (t.scalable ? 'ok' : t.util > 1 ? 'over' : t.util > 0.7 ? 'warn' : 'ok')

  const nodeStatus = {}
  if (entry) nodeStatus[entry.id] = { level: 'ok', util: 100, scalable: true }
  for (const t of result.tiers) {
    nodeStatus[t.id] = { level: levelOf(t), util: Math.round(t.util * 100), scalable: t.scalable }
  }

  const steps = []
  let prevId = entry?.id
  let blocked = false
  for (const t of result.tiers) {
    if (blocked) break
    const level = levelOf(t)
    const verdict = level === 'over' ? 'blocked' : level === 'warn' ? 'insecure' : 'ok'
    // ok → green, warn → amber (canvas default for 'insecure'), over → red (default for 'blocked')
    const color = level === 'ok' ? 'rgb(74 222 128)' : undefined
    const pct = Math.round(t.util * 100)
    let note
    if (level === 'over') {
      const fix = result.recommendations?.find((r) => r.label)
      note = `⚠ OVERFLOW at ${t.name}: ${t.incoming.toLocaleString()} req/s hitting only ${t.capacity.toLocaleString()} capacity (${pct}%). The connection breaks — requests are dropping.${fix ? ` Fix: ${fix.label}.` : ''}`
    } else if (level === 'warn') {
      note = `${t.name} is running hot — ${pct}% of capacity (${t.incoming.toLocaleString()}/${t.capacity.toLocaleString()} req/s). Latency climbing; close to the limit.`
    } else {
      note = t.scalable
        ? `${t.name} scales automatically — absorbing ${t.incoming.toLocaleString()} req/s comfortably.`
        : `${t.name}: ${pct}% used (${t.incoming.toLocaleString()}/${t.capacity.toLocaleString()} req/s). Healthy.`
    }
    if (prevId) {
      steps.push({
        edge: edgeBetween(edges, prevId, t.id) || { id: `lf${steps.length}` },
        from: prevId,
        to: t.id,
        verdict,
        color,
        note,
        packet: level === 'over' ? '⚠ overflow' : `${fmtRps(t.incoming)} rps`,
      })
    }
    if (verdict === 'blocked') blocked = true
    prevId = t.id
  }

  if (!blocked && entry) {
    steps.push({
      edge: { id: `lf${steps.length}` },
      from: prevId,
      to: entry.id,
      verdict: 'ok',
      color: 'rgb(74 222 128)',
      note: `Every tier held up — ${fmtRps(result.servedRps)} req/s served and the response flows back to the user. ✓`,
      packet: '200 OK ◀',
    })
  }

  return {
    ok: !blocked,
    status: result.status,
    servedRps: result.servedRps,
    bottleneck: result.bottleneck,
    recommendations: result.recommendations,
    steps,
    nodeStatus,
    reason: null,
  }
}

function recommend(b, hasCache, maxUtil) {
  const recs = []
  if (!b || maxUtil <= 0.7) {
    if (b && maxUtil < 0.18 && (b.kind === 'compute' || b.kind === 'container') && !b.node.config?.autoScale && (b.node.config?.instances || 1) > 1) {
      recs.push({
        id: 'downsize', nodeId: b.id, level: 'cost',
        label: 'Right-size to save money',
        detail: `${b.name} is barely used at this traffic. Drop to 1 instance (or enable Auto Scaling) to cut cost.`,
        patch: { config: { ...b.node.config, instances: 1 } },
      })
    }
    return recs
  }
  const c = b.node.config || {}
  const per = instanceRps(c.instanceType)

  if (b.kind === 'compute' || b.kind === 'container') {
    const needed = Math.ceil(b.incoming / per)
    if (!c.autoScale) {
      recs.push({
        id: 'autoscale', nodeId: b.id, level: 'fix',
        label: 'Enable Auto Scaling',
        detail: `Let ${b.name} scale out automatically (up to ${Math.max(c.maxInstances || 0, needed)} instances) when traffic rises, instead of a fixed fleet.`,
        patch: { config: { ...c, autoScale: true, maxInstances: Math.max(c.maxInstances || 0, needed) } },
      })
      recs.push({
        id: 'scaleout', nodeId: b.id, level: 'fix',
        label: `Scale out to ${needed} instances`,
        detail: `${b.name} needs ~${needed}× ${c.instanceType} to absorb ${b.incoming.toLocaleString()} req/s.`,
        patch: { config: { ...c, instances: needed } },
      })
    } else if (needed > (c.maxInstances || 0)) {
      recs.push({
        id: 'raisemax', nodeId: b.id, level: 'fix',
        label: `Raise max instances to ${needed}`,
        detail: `Auto Scaling is capped at ${c.maxInstances}; it needs to reach ~${needed} to keep up.`,
        patch: { config: { ...c, maxInstances: needed } },
      })
    }
    const bigger = nextType(c.instanceType)
    if (bigger) {
      recs.push({
        id: 'upsize', nodeId: b.id, level: 'fix',
        label: `Upgrade to ${bigger}`,
        detail: `A larger instance type handles more per node — fewer instances to manage.`,
        patch: { config: { ...c, instanceType: bigger } },
      })
    }
  }

  if (b.kind === 'database') {
    recs.push({
      id: 'replica', nodeId: b.id, level: 'fix',
      label: 'Add a read replica',
      detail: `Offload read queries from ${b.name} to a replica to multiply read throughput.`,
      patch: { config: { ...c, readReplicas: (c.readReplicas || 0) + 1 } },
    })
    const bigger = nextDbClass(c.dbClass)
    if (bigger) {
      recs.push({
        id: 'dbupsize', nodeId: b.id, level: 'fix',
        label: `Upgrade to ${bigger}`,
        detail: `A bigger DB class raises sustained query throughput.`,
        patch: { config: { ...c, dbClass: bigger } },
      })
    }
    if (!hasCache) {
      recs.push({
        id: 'addcache', nodeId: null, level: 'advice',
        label: 'Add an ElastiCache cache',
        detail: `Drag an ElastiCache node in front of ${b.name} and wire the app to it — it absorbs ~80% of reads so the DB sees far less load.`,
        patch: null,
      })
    }
  }
  return recs
}
