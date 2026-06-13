// Network-flow simulator for Ground0: Cloud — Architecture Studio.
//
// buildSimulation({ nodes, edges }, { targetId }) walks a request from an
// internet entry to a target (a data tier by default) and returns ordered
// hops, each with a verdict the canvas animates: 'ok' (cyan), 'insecure'
// (amber — flows but violates a best practice) or 'blocked' (red X — the
// security group rejects the port and the packet stops here).

import { STATEFUL_KINDS, PUBLIC_ENTRY_KINDS } from '../../data/cloud/components.js'

const isInternet = (n) => n.kind === 'internet'

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

// Pick the most interesting target: a data tier reachable from the entry,
// else the node farthest from the entry.
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
  const data = reachable.filter((id) => STATEFUL_KINDS.includes(byId[id].kind))
  const pool = data.length ? data : reachable
  return pool.sort((a, b) => dist[b] - dist[a])[0]
}

export function buildSimulation({ nodes = [], edges = [] }, { targetId } = {}) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const adj = buildAdjacency(nodes, edges)

  const entry = nodes.find(isInternet)
  if (!entry) {
    return { ok: false, reason: 'Add a "Users / Internet" node to simulate an incoming request.', steps: [] }
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

  const steps = []
  let blockedAt = null
  for (const e of path) {
    const from = byId[e.from]
    const to = byId[e.to]
    const port = e.port

    // Security-group check: does the destination accept this port?
    // Internet/edge managed services accept anything; everything else must
    // list the port in its security group.
    const managed = ['internet', 'edge', 'dns', 'cdn', 'waf'].includes(to.kind)
    const allowsPort = managed || (to.ports || []).includes(port)

    let verdict = 'ok'
    let note = `${from.name} → ${to.name} on :${port} — accepted.`

    if (!allowsPort) {
      verdict = 'blocked'
      note = `Blocked: ${to.name}'s security group does not allow inbound :${port}. Open it (or fix the source port) to let traffic through.`
    } else if (STATEFUL_KINDS.includes(to.kind) && (isInternet(from) || PUBLIC_ENTRY_KINDS.includes(from.kind))) {
      verdict = 'insecure'
      note = `Reaches ${to.name}, but data tiers should sit behind the app tier — not directly behind ${from.name}.`
    } else if (to.openToInternet && !['internet', 'edge', 'dns', 'cdn', 'waf', 'lb', 'gateway'].includes(to.kind)) {
      verdict = 'insecure'
      note = `Reaches ${to.name} on :${port}, but its security group is open to 0.0.0.0/0 — tighten it.`
    }

    steps.push({ edge: e, from: from.id, to: to.id, port, verdict, note, packet: `:${port}` })
    if (verdict === 'blocked') {
      blockedAt = steps.length - 1
      break
    }
  }

  return {
    ok: blockedAt === null,
    blockedAt,
    target,
    targetName: byId[target].name,
    steps,
    reason: null,
  }
}

// Data-tier endpoints the user can choose as a simulation target.
export function simulationTargets(nodes) {
  return nodes.filter((n) => !isInternet(n) && n.kind !== 'edge' && n.kind !== 'waf')
}
