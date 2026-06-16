// Network-flow simulator for Ground0: Cloud — Architecture Studio.
//
// buildSimulation({ nodes, edges }, { targetId }) walks a request from an
// internet entry to a target (a data tier by default) and returns ordered
// hops, each with a verdict the canvas animates: 'ok' (cyan), 'insecure'
// (amber — flows but violates a best practice) or 'blocked' (red X — the hop
// is rejected and the packet stops). A hop is blocked when the wiring is
// illogical (classifyEdge, shared with the review engine) OR the destination's
// security group rejects the port.
//
// When the app tier talks to BOTH a cache and a database, the request is
// modelled as cache-aside: check the cache → on a miss, fall through to the
// database, then populate the cache so the next read is a HIT.

import { STATEFUL_KINDS, PUBLIC_ENTRY_KINDS, COMPUTE_KINDS } from '../../data/cloud/components.js'
import { classifyEdge } from './rules.js'

const isInternet = (n) => n.kind === 'internet'
// Managed / edge destinations accept any port (no security group to satisfy).
const MANAGED_TO = ['internet', 'edge', 'dns', 'cdn', 'waf', 'client']
// Destinations where being open to the internet is expected (not flagged).
const SG_EXEMPT = ['internet', 'edge', 'dns', 'cdn', 'waf', 'lb', 'gateway', 'client']

// Response-leg colours.
const GREEN = 'rgb(74 222 128)'
const AMBER = 'rgb(245 158 11)'
const VIOLET = 'rgb(167 139 250)'
const EGRESS = 'rgb(251 146 60)' // orange — outbound egress through a NAT gateway

// Pass-through infrastructure — never the endpoint of a request.
const INFRA_KINDS = ['internet', 'nat', 'dns', 'cdn', 'waf', 'lb', 'gateway', 'client', 'edge']
const DATA_TIER_KINDS = ['database', 'cache', 'storage']
const COMPUTE_TIER_KINDS = ['compute', 'container', 'serverless']

function buildAdjacency(nodes, edges) {
  const out = {}
  nodes.forEach((n) => (out[n.id] = []))
  edges.forEach((e) => {
    if (out[e.from] && out[e.to]) out[e.from].push(e)
  })
  return out
}

// Shortest edge path (BFS) between two node ids. Returns array of edges.
function findPath(adj, fromId, toId) {
  if (fromId === toId) return []
  const prev = {} // nodeId -> edge used to reach it
  const seen = new Set([fromId])
  const queue = [fromId]
  while (queue.length) {
    const id = queue.shift()
    for (const e of adj[id] || []) {
      if (seen.has(e.to)) continue
      seen.add(e.to)
      prev[e.to] = e
      if (e.to === toId) {
        const path = []
        let cur = toId
        while (cur !== fromId) {
          const edge = prev[cur]
          path.unshift(edge)
          cur = edge.from
        }
        return path
      }
      queue.push(e.to)
    }
  }
  return null
}

// Pick the request's ENDPOINT — the system of record the request is ultimately
// for. Prefer a data tier (database > storage > cache), then the deepest compute
// (the app). NEVER pick infrastructure like a NAT gateway, load balancer or the
// internet: those are pass-throughs on the way to an endpoint, not endpoints.
function pickTarget(nodes, adj, entryId, byId) {
  const dist = { [entryId]: 0 }
  const queue = [entryId]
  while (queue.length) {
    const id = queue.shift()
    for (const e of adj[id] || []) {
      if (dist[e.to] === undefined) {
        dist[e.to] = dist[id] + 1
        queue.push(e.to)
      }
    }
  }
  const reachable = Object.keys(dist).filter((id) => id !== entryId)
  if (!reachable.length) return null

  // 1. A real data endpoint — a database is the canonical system of record.
  const data = reachable.filter((id) => DATA_TIER_KINDS.includes(byId[id].kind))
  if (data.length) {
    const rank = (id) => { const k = byId[id].kind; return k === 'database' ? 0 : k === 'storage' ? 1 : 2 }
    return data.sort((a, b) => rank(a) - rank(b) || dist[b] - dist[a])[0]
  }
  // 2. No data tier — the deepest compute node (the app) is the endpoint.
  const compute = reachable.filter((id) => COMPUTE_TIER_KINDS.includes(byId[id].kind))
  if (compute.length) return compute.sort((a, b) => dist[b] - dist[a])[0]
  // 3. Last resort — deepest non-infrastructure node (never a NAT / LB / edge).
  const pool = reachable.filter((id) => !INFRA_KINDS.includes(byId[id].kind))
  if (!pool.length) return null
  return pool.sort((a, b) => dist[b] - dist[a])[0]
}

// Evaluate a single forward hop from → to on a port. Illegal wiring blocks
// first (most fundamental), then a rejecting security group, then softer
// best-practice cautions.
function evalHop(from, to, port) {
  const legal = classifyEdge(from, to)
  if (!legal.ok) {
    return { verdict: 'blocked', note: `Blocked — illogical setup. ${legal.reason}` }
  }
  const allowsPort = MANAGED_TO.includes(to.kind) || (to.ports || []).includes(port)
  if (!allowsPort) {
    return {
      verdict: 'blocked',
      note: `Blocked: ${to.name}'s security group does not allow inbound :${port}. Open it (or fix the source port) to let traffic through.`,
    }
  }
  if (STATEFUL_KINDS.includes(to.kind) && (isInternet(from) || PUBLIC_ENTRY_KINDS.includes(from.kind))) {
    return {
      verdict: 'insecure',
      note: `Reaches ${to.name}, but data tiers should sit behind the app tier — not directly behind ${from.name}.`,
    }
  }
  if (to.openToInternet && !SG_EXEMPT.includes(to.kind)) {
    return {
      verdict: 'insecure',
      note: `Reaches ${to.name} on :${port}, but its security group is open to 0.0.0.0/0 — tighten it.`,
    }
  }
  return { verdict: 'ok', note: `${from.name} → ${to.name} on :${port} — accepted.` }
}

// Forward request steps along an edge path. Stops at the first blocked hop.
function forwardSteps(path, byId) {
  const steps = []
  let blockedAt = null
  for (const e of path) {
    const from = byId[e.from]
    const to = byId[e.to]
    const { verdict, note } = evalHop(from, to, e.port)
    steps.push({ edge: e, from: from.id, to: to.id, port: e.port, verdict, note, packet: `:${e.port}` })
    if (verdict === 'blocked') {
      blockedAt = steps.length - 1
      break
    }
  }
  return { steps, blockedAt }
}

// Response travels back along the same path to the user (green = response),
// completing the full request → response cycle.
function responseSteps(path, byId) {
  const steps = []
  for (let i = path.length - 1; i >= 0; i--) {
    const e = path[i]
    const src = byId[e.to] // the response originates from the deeper tier
    const dst = byId[e.from]
    const last = i === 0
    steps.push({
      edge: e,
      from: src.id,
      to: dst.id,
      port: e.port,
      verdict: 'ok',
      color: GREEN,
      note: last
        ? `${src.name} sends the response back to ${dst.name}. 200 OK — the user has their answer. Full request → response cycle complete. ✓`
        : `${src.name} returns its result up to ${dst.name}.`,
      packet: last ? '200 OK ◀' : 'response ◀',
    })
  }
  return steps
}

// An app tier that fans out to BOTH a cache and a database is a cache-aside read.
function findCacheAside(nodes, edges, byId) {
  for (const n of nodes) {
    if (!COMPUTE_KINDS.includes(n.kind)) continue
    const outs = edges.filter((e) => e.from === n.id)
    const cacheEdge = outs.find((e) => byId[e.to]?.kind === 'cache')
    const dbEdge = outs.find((e) => byId[e.to]?.kind === 'database')
    if (cacheEdge && dbEdge) return { appId: n.id, cacheEdge, dbEdge }
  }
  return null
}

// Cache-aside read: check the cache, miss → database, then populate the cache.
function buildCacheAside(entry, ca, adj, byId) {
  const app = byId[ca.appId]
  const cache = byId[ca.cacheEdge.to]
  const db = byId[ca.dbEdge.to]
  const toApp = findPath(adj, entry.id, ca.appId)
  if (!toApp || !toApp.length) return null // no path to the app — fall back

  const fwd = forwardSteps(toApp, byId)
  if (fwd.blockedAt !== null) {
    return { ok: false, blockedAt: fwd.blockedAt, target: ca.appId, targetName: app.name, steps: fwd.steps, reason: null }
  }

  const steps = [...fwd.steps]
  const cachePort = ca.cacheEdge.port
  const dbPort = ca.dbEdge.port

  // 1. Check the cache first.
  if (!(cache.ports || []).includes(cachePort)) {
    steps.push({
      edge: ca.cacheEdge, from: app.id, to: cache.id, port: cachePort, verdict: 'blocked',
      note: `Blocked: ${cache.name}'s security group does not allow inbound :${cachePort}, so the app can't reach the cache.`,
      packet: `:${cachePort}`,
    })
    return { ok: false, blockedAt: steps.length - 1, target: cache.id, targetName: cache.name, steps, reason: null }
  }
  steps.push({
    edge: ca.cacheEdge, from: app.id, to: cache.id, port: cachePort, verdict: 'ok',
    note: `Cache-aside: ${app.name} checks ${cache.name} first. On a HIT it returns from memory in <1 ms and never touches the database.`,
    packet: `GET :${cachePort}`,
  })

  // 2. Miss — fall through to the database.
  steps.push({
    edge: ca.cacheEdge, from: cache.id, to: app.id, port: cachePort, verdict: 'ok', color: AMBER,
    note: `Cache MISS — this key isn't cached yet, so ${app.name} falls through to the database.`,
    packet: 'MISS ◀',
  })

  // 3. Query the database.
  if (!(db.ports || []).includes(dbPort)) {
    steps.push({
      edge: ca.dbEdge, from: app.id, to: db.id, port: dbPort, verdict: 'blocked',
      note: `Blocked: ${db.name}'s security group does not allow inbound :${dbPort}.`,
      packet: `:${dbPort}`,
    })
    return { ok: false, blockedAt: steps.length - 1, target: db.id, targetName: db.name, steps, reason: null }
  }
  steps.push({
    edge: ca.dbEdge, from: app.id, to: db.id, port: dbPort, verdict: 'ok',
    note: `${app.name} queries ${db.name} for the data.`,
    packet: `:${dbPort}`,
  })

  // 4. Database returns the row.
  steps.push({
    edge: ca.dbEdge, from: db.id, to: app.id, port: dbPort, verdict: 'ok', color: GREEN,
    note: `${db.name} returns the row to ${app.name}.`,
    packet: 'row ◀',
  })

  // 5. Populate the cache so the next read is a HIT.
  steps.push({
    edge: ca.cacheEdge, from: app.id, to: cache.id, port: cachePort, verdict: 'ok', color: VIOLET,
    note: `${app.name} writes the result into ${cache.name} (SET). The next read of this key is a HIT — served from memory, no DB round-trip.`,
    packet: 'SET',
  })

  // 6. Response back to the user.
  steps.push(...responseSteps(toApp, byId))

  return { ok: true, blockedAt: null, target: db.id, targetName: `${cache.name} + ${db.name}`, steps, reason: null }
}

// A private compute tier reaching the internet OUTBOUND through a NAT gateway —
// the real-world pattern: pulling OS patches / installing packages / calling a
// third-party API. NAT is one-way: the internet can never initiate inbound.
function findEgress(nodes, edges, byId) {
  const nat = nodes.find((n) => n.kind === 'nat')
  if (!nat) return null
  const inEdge = edges.find((e) => e.to === nat.id && COMPUTE_TIER_KINDS.includes(byId[e.from]?.kind))
  if (!inEdge) return null
  const outEdge = edges.find((e) => e.from === nat.id && byId[e.to]?.kind === 'internet')
  const internet = outEdge ? byId[outEdge.to] : nodes.find((n) => n.kind === 'internet')
  return { appId: inEdge.from, nat, internet, inEdge, outEdge }
}

// Steps for the outbound egress demo, appended after the request → response
// cycle so users see how a private subnet reaches the internet through the NAT.
function egressSteps(eg, byId) {
  const app = byId[eg.appId]
  const { nat, internet } = eg
  const port = eg.inEdge.port ?? 443
  const steps = [
    {
      edge: eg.inEdge, from: app.id, to: nat.id, port, verdict: 'ok', color: EGRESS,
      note: `Outbound egress — ${app.name} needs to fetch OS patches / install packages / call a third-party API. A private subnet has no route to the internet of its own, so it goes OUT through ${nat.name}.`,
      packet: 'egress →',
    },
  ]
  if (internet) {
    const outE = eg.outEdge || { id: 'eg-out' }
    const oport = eg.outEdge?.port ?? 443
    steps.push(
      {
        edge: outE, from: nat.id, to: internet.id, port: oport, verdict: 'ok', color: EGRESS,
        note: `${nat.name} swaps the private source IP for its own public IP (source NAT) and forwards the request to the internet — the only way out for private instances.`,
        packet: '→ internet',
      },
      {
        edge: outE, from: internet.id, to: nat.id, port: oport, verdict: 'ok', color: GREEN,
        note: `The external service responds to ${nat.name}.`,
        packet: '← reply',
      },
    )
  }
  steps.push({
    edge: eg.inEdge, from: nat.id, to: app.id, port, verdict: 'ok', color: GREEN,
    note: `${nat.name} routes the reply back to ${app.name}. Crucially, the internet could NOT have opened this connection itself — NAT is outbound-only, so the private subnet stays unreachable from the internet. ✓`,
    packet: '← back',
  })
  return steps
}

// Append the NAT egress demonstration to a successful request → response cycle.
function withEgress(sim, eg, byId) {
  if (!eg || !sim.ok) return sim
  return { ...sim, egress: true, steps: [...sim.steps, ...egressSteps(eg, byId)] }
}

export function buildSimulation({ nodes = [], edges = [] }, { targetId } = {}) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const adj = buildAdjacency(nodes, edges)

  const entry = nodes.find(isInternet)
  if (!entry) {
    return { ok: false, reason: 'Add a "Users / Internet" node to simulate an incoming request.', steps: [] }
  }

  // A private compute tier egressing to the internet through a NAT — appended to
  // the request flow so the outbound-only pattern is visible end-to-end.
  const egress = findEgress(nodes, edges, byId)

  // Cache-aside read if the app fans out to a cache + a database, and the user
  // hasn't explicitly targeted a node outside that pattern.
  const ca = findCacheAside(nodes, edges, byId)
  if (ca && (!targetId || [ca.cacheEdge.to, ca.dbEdge.to, ca.appId].includes(targetId))) {
    const sim = buildCacheAside(entry, ca, adj, byId)
    if (sim) return withEgress(sim, egress, byId)
  }

  const target = targetId && byId[targetId] ? targetId : pickTarget(nodes, adj, entry.id, byId)
  if (!target) {
    return { ok: false, reason: 'Nothing is connected to the internet entry point yet.', steps: [] }
  }

  const path = findPath(adj, entry.id, target)
  if (!path || !path.length) {
    return {
      ok: false,
      reason: `No connected path from the internet to ${byId[target].name}. Draw the missing connection.`,
      steps: [],
    }
  }

  const { steps, blockedAt } = forwardSteps(path, byId)
  if (blockedAt === null) steps.push(...responseSteps(path, byId))

  return withEgress({
    ok: blockedAt === null,
    blockedAt,
    target,
    targetName: byId[target].name,
    steps,
    reason: null,
  }, egress, byId)
}

// Endpoints the user can choose as a simulation target — data tiers and compute
// (the app). Pass-through infrastructure (NAT, load balancer, gateway, CDN, DNS,
// WAF, client, internet) is never a request endpoint, so it's excluded.
export function simulationTargets(nodes) {
  const ENDPOINT_KINDS = [...DATA_TIER_KINDS, ...COMPUTE_TIER_KINDS, 'queue']
  return nodes.filter((n) => ENDPOINT_KINDS.includes(n.kind))
}
