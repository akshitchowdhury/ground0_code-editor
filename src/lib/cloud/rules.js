// Pipeline ordering + connection legality for Ground0: Cloud — Architecture Studio.
//
// A real request flows in ONE direction through well-defined tiers:
//   Web → Security/Edge → Load Balancer → Compute → Backend → Data/Storage
// and the response travels back. This module is the single source of truth for
// that ordering. It is pure and engine-facing: analyze.js, simulate.js and the
// designer all consult it, so an illogical wiring (e.g. Database → Load Balancer,
// or Internet → NAT) is caught the same way everywhere — flagged in the review,
// blocked in the simulated flow, and refused at connect time. The rules stay
// permissive about *skipping* a tier (flexibility) but firm about *reversing*
// or *short-circuiting* one (correctness).

import { STATEFUL_KINDS, COMPUTE_KINDS, PUBLIC_ENTRY_KINDS } from '../../data/cloud/components.js'

// Canonical request-path rank for each component kind. Lower = closer to the
// user, higher = deeper in the stack. A forward request edge must never go from
// a higher rank to a lower one — that is data flowing backwards.
// `nat` and `queue` are intentionally absent: NAT is egress-only infrastructure
// (handled explicitly below) and queues are async/event-driven, so neither sits
// at a fixed point in the synchronous request path.
export const FLOW_RANK = {
  internet: 0,
  client: 1,
  dns: 1,
  cdn: 2,
  waf: 2,
  lb: 3,
  gateway: 3,
  compute: 4,
  container: 4,
  serverless: 4,
  database: 6,
  cache: 6,
  storage: 6,
}

// Human phrase for each kind, used in error messages.
export const STAGE_OF = {
  internet: 'the web tier',
  client: 'the web tier',
  dns: 'the edge / security tier',
  cdn: 'the edge / security tier',
  waf: 'the edge / security tier',
  lb: 'the load-balancer tier',
  gateway: 'the load-balancer tier',
  compute: 'the compute tier',
  container: 'the compute tier',
  serverless: 'the compute tier',
  queue: 'the messaging tier',
  database: 'the data tier',
  cache: 'the data tier',
  storage: 'the storage tier',
  nat: 'an outbound NAT gateway',
}

// Coarse request stages used for the "data can't flow backwards" check. These
// are deliberately broader than FLOW_RANK so the front of the stack stays
// flexible: a firewall / WAF may legitimately sit either before OR after the
// load balancer, so edge-security and load balancing share one stage. Only a
// move to a strictly *earlier* stage (e.g. data → load balancer) is reversed.
//   0 web · 1 edge-security + load balancer · 2 compute · 3 data/storage
const STAGE = {
  internet: 0,
  client: 0,
  dns: 1,
  cdn: 1,
  waf: 1,
  lb: 1,
  gateway: 1,
  compute: 2,
  container: 2,
  serverless: 2,
  database: 3,
  cache: 3,
  storage: 3,
}

// Leaves / sinks: they answer queries and persist data, they never originate a
// forward request up the stack.
const LEAF_KINDS = ['database', 'cache', 'storage']
const isLeaf = (k) => LEAF_KINDS.includes(k)

export function rankOf(node) {
  return node ? FLOW_RANK[node.kind] ?? null : null
}

// Classify a directed connection from → to.
// Returns { ok, level: 'ok' | 'illegal', code, reason }.
// `ok` connections may still be sub-optimal (e.g. skipping a load balancer);
// those softer issues are surfaced as warnings by analyze.js, not blocked here.
export function classifyEdge(from, to) {
  if (!from || !to) return { ok: false, level: 'illegal', code: 'missing', reason: 'Connection endpoints are missing.' }
  if (from.id === to.id) return { ok: false, level: 'illegal', code: 'self', reason: 'A component cannot connect to itself.' }

  const fk = from.kind
  const tk = to.kind
  const fname = from.label || from.name
  const tname = to.label || to.name

  // ── NAT Gateway: outbound (egress) ONLY ──────────────────────────
  // The one legitimate use: a PRIVATE compute tier reaches out to the internet
  // *through* the NAT (compute → nat). The internet must never reach private
  // hosts via the NAT — preventing exactly that is the NAT's whole job.
  if (tk === 'nat') {
    if (COMPUTE_KINDS.includes(fk)) {
      return {
        ok: true, level: 'ok', code: 'nat-egress',
        reason: `${fname} reaches the internet for outbound traffic (OS patches, package installs, third-party APIs) through ${tname}.`,
      }
    }
    return {
      ok: false, level: 'illegal', code: 'nat-inbound',
      reason: `A NAT Gateway is outbound-only. ${fname} can't push traffic INTO ${tname} — the internet must never reach private resources through a NAT. Route inbound requests through a load balancer / API gateway instead.`,
    }
  }
  // A NAT only forwards OUTBOUND, to the internet — never an inbound request on
  // to a private host (database / compute / cache …).
  if (fk === 'nat' && tk !== 'internet') {
    return {
      ok: false, level: 'illegal', code: 'nat-forward',
      reason: `A NAT Gateway only provides outbound access to the internet — it does not forward requests on to ${tname}. ${tname} should be reached through the app tier, not the NAT.`,
    }
  }

  const sf = STAGE[fk]
  const st = STAGE[tk]

  // ── Data tiers are leaves: they answer queries, never initiate them ──
  // (Two data tiers in the same stage, e.g. db ↔ cache, are allowed.)
  if (isLeaf(fk) && !(isLeaf(tk) && sf === st)) {
    return {
      ok: false, level: 'illegal', code: 'data-source',
      reason: `${fname} is a data tier — it answers queries, it doesn't call out to ${tname}. Reverse the connection so the app / compute tier calls ${fname}.`,
    }
  }

  // ── A client / the internet must never hit a data tier directly ──
  if ((fk === 'internet' || fk === 'client') && isLeaf(tk)) {
    return {
      ok: false, level: 'illegal', code: 'client-to-data',
      reason: `${fname} is wired straight to ${tname}. A frontend / client must never hold database credentials or query a data tier directly — put a backend / API tier in between.`,
    }
  }

  // ── Data must flow forward through the tiers, not backwards ──
  if (sf != null && st != null && sf > st) {
    return {
      ok: false, level: 'illegal', code: 'backwards',
      reason: `Illogical setup: data can't flow backwards. ${fname} (${STAGE_OF[fk]}) sits AFTER ${tname} (${STAGE_OF[tk]}) in the request path. Wire tiers in order — Web → Security → Load Balancer → Compute → Data.`,
    }
  }

  // Forward and legal. Skipping a tier (e.g. internet → compute with no load
  // balancer) is permitted for flexibility, and flagged as a warning elsewhere.
  return { ok: true, level: 'ok', code: 'ok', reason: `${fname} → ${tname}.` }
}

// Visual lane guide ("watermark") rendered behind the canvas so users can lay a
// design out in the recommended left → right order. Mirrors FLOW_RANK.
export const PIPELINE_LANES = [
  { label: 'Web', hint: 'Users · Client', kinds: ['internet', 'client'] },
  { label: 'Security', hint: 'DNS · CDN · WAF', kinds: ['dns', 'cdn', 'waf'] },
  { label: 'Load Balancer', hint: 'ALB · API GW', kinds: ['lb', 'gateway'] },
  { label: 'Compute', hint: 'EC2 · ECS', kinds: ['compute', 'container'] },
  { label: 'Backend', hint: 'API · Lambda', kinds: ['serverless'] },
  { label: 'Data & Storage', hint: 'DB · Cache · S3', kinds: ['database', 'cache', 'storage', 'queue'] },
]
