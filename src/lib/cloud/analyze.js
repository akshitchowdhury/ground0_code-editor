// Architecture rules engine for Ground0: Cloud — Architecture Studio.
//
// Pure: analyzeArchitecture({ nodes, edges }) -> {
//   findings: [{ id, level, category, title, detail, nodeIds }],
//   securityScore, designScore, overall, verdict
// }
// Nodes are self-describing (they carry `kind`, `tier`, `ports`,
// `openToInternet`, `config`), so this module never touches the catalog.

import { STATEFUL_KINDS, COMPUTE_KINDS, PUBLIC_ENTRY_KINDS, SENSITIVE_PORTS } from '../../data/cloud/components.js'

const LEVEL_WEIGHT = { critical: 30, high: 17, warn: 9, info: 4, ok: 0 }
const SECURITY_CATS = ['security', 'iam', 'storage']

export const CATEGORY_LABELS = {
  security: 'Security',
  iam: 'IAM',
  storage: 'Storage',
  network: 'Network',
  reliability: 'Reliability',
  performance: 'Performance',
  cost: 'Cost',
}

const isStateful = (n) => STATEFUL_KINDS.includes(n.kind)
const isCompute = (n) => COMPUTE_KINDS.includes(n.kind)
const isInternet = (n) => n.kind === 'internet'

// Build undirected + directed adjacency once.
function buildGraph(nodes, edges) {
  const out = {} // directed: from -> [to]
  const inc = {} // directed: to -> [from]
  const undirected = {} // either direction
  nodes.forEach((n) => {
    out[n.id] = []
    inc[n.id] = []
    undirected[n.id] = []
  })
  edges.forEach((e) => {
    if (!out[e.from] || !out[e.to]) return
    out[e.from].push(e.to)
    inc[e.to].push(e.from)
    undirected[e.from].push(e.to)
    undirected[e.to].push(e.from)
  })
  return { out, inc, undirected }
}

// Set of node ids reachable from any internet node by following edges.
function reachableFromInternet(nodes, graph) {
  const entries = nodes.filter(isInternet).map((n) => n.id)
  const seen = new Set(entries)
  const stack = [...entries]
  while (stack.length) {
    const id = stack.pop()
    for (const next of graph.out[id] || []) {
      if (!seen.has(next)) {
        seen.add(next)
        stack.push(next)
      }
    }
  }
  return seen
}

export function analyzeArchitecture({ nodes = [], edges = [] }) {
  const findings = []
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const graph = buildGraph(nodes, edges)
  const reachable = reachableFromInternet(nodes, graph)

  const add = (level, category, title, detail, nodeIds = []) =>
    findings.push({ id: `${category}-${findings.length}`, level, category, title, detail, nodeIds })

  // ── SECURITY ────────────────────────────────────────────────────

  // 1. Stateful data in a non-private subnet.
  for (const n of nodes) {
    if (isStateful(n) && n.tier !== 'private') {
      add(
        'critical',
        'security',
        `${n.name} is not in a private subnet`,
        `Databases and caches should never sit in a "${n.tier}" tier. Move ${n.name} into a private subnet so it is unreachable from the internet.`,
        [n.id],
      )
    }
  }

  // 2. Stateful data directly reachable from the internet (1 hop) or open to 0.0.0.0/0.
  for (const n of nodes) {
    if (!isStateful(n)) continue
    const directFromEdge = graph.inc[n.id].some((src) => {
      const s = byId[src]
      return s && (isInternet(s) || PUBLIC_ENTRY_KINDS.includes(s.kind))
    })
    if (n.openToInternet || directFromEdge) {
      add(
        'critical',
        'security',
        `${n.name} is exposed to the internet`,
        n.openToInternet
          ? `${n.name}'s security group allows 0.0.0.0/0. Data tiers must only accept traffic from the application tier.`
          : `${n.name} receives traffic straight from an internet-facing component. Put a compute/app tier in front of it.`,
        [n.id],
      )
    }
  }

  // 3. Sensitive ports open to the whole internet.
  for (const n of nodes) {
    if (!n.openToInternet) continue
    const bad = (n.ports || []).filter((p) => SENSITIVE_PORTS[p])
    if (bad.length) {
      const names = bad.map((p) => `${SENSITIVE_PORTS[p]} (${p})`).join(', ')
      add(
        bad.some((p) => p !== 22 && p !== 3389) ? 'critical' : 'high',
        'security',
        `${n.name} opens ${names} to 0.0.0.0/0`,
        `Administrative and database ports must not be open to the whole internet. Restrict the security group to a bastion/VPN or the app tier.`,
        [n.id],
      )
    }
  }

  // 4. Compute exposed directly to the internet (no LB / gateway in front).
  for (const n of nodes) {
    if (!isCompute(n)) continue
    const directFromInternet = graph.inc[n.id].some((src) => byId[src] && isInternet(byId[src]))
    if (n.openToInternet || directFromInternet) {
      add(
        'high',
        'security',
        `${n.name} is directly internet-facing`,
        `Put a load balancer or API gateway in front of ${n.name} instead of exposing the instance. The compute tier should live in a private subnet.`,
        [n.id],
      )
    }
  }

  // 4b. Frontend/client talking straight to a data tier (no backend between).
  for (const n of nodes) {
    if (!isStateful(n)) continue
    const fromClient = graph.inc[n.id].some((src) => byId[src]?.kind === 'client')
    if (fromClient) {
      add(
        'high',
        'security',
        `${n.name} is queried directly by the frontend`,
        `A client / frontend is wired straight to ${n.name}. Put a backend / API tier in between — clients must never hold database credentials or hit the database directly.`,
        [n.id],
      )
    }
  }

  // 5. No WAF in front of a public entry point.
  const publicEntries = nodes.filter((n) => PUBLIC_ENTRY_KINDS.includes(n.kind) && reachable.has(n.id))
  const hasWaf = nodes.some((n) => n.kind === 'waf')
  if (publicEntries.length && !hasWaf) {
    add(
      'warn',
      'security',
      'No Web Application Firewall',
      'Public entry points are exposed without a WAF. Add one to filter common web exploits and abusive traffic.',
      publicEntries.map((n) => n.id),
    )
  }

  // 6. Plaintext-only edge at the front door (HTTP without HTTPS).
  for (const e of edges) {
    const from = byId[e.from]
    const to = byId[e.to]
    if (!from || !to) continue
    if ((isInternet(from) || from.kind === 'edge') && e.port === 80) {
      add(
        'warn',
        'security',
        'Traffic enters over plain HTTP',
        `The edge ${from.name} → ${to.name} uses port 80. Serve over HTTPS (443) and redirect HTTP so credentials are never sent in the clear.`,
        [from.id, to.id],
      )
    }
  }

  // 7. Over-privileged IAM role (wildcard *).
  for (const n of nodes) {
    if ((isCompute(n) || n.kind === 'serverless') && n.config?.iam === 'admin') {
      add(
        'high',
        'iam',
        `${n.name} uses an over-privileged IAM role`,
        `${n.name} is attached to an admin / wildcard (*:*) policy. Grant least privilege — scope the role to only the actions and resources it actually needs.`,
        [n.id],
      )
    }
  }

  // 8. Encryption at rest.
  for (const n of nodes) {
    if (n.config && 'encrypted' in n.config && !n.config.encrypted) {
      add(
        n.kind === 'database' ? 'high' : 'warn',
        'storage',
        `${n.name} is not encrypted at rest`,
        `Turn on encryption at rest (KMS) for ${n.name}. It is a one-click setting and is expected for anything storing data.`,
        [n.id],
      )
    }
  }

  // 9. Public object storage.
  for (const n of nodes) {
    if (n.kind === 'storage' && n.config?.public) {
      add(
        'critical',
        'storage',
        `${n.name} is a public bucket`,
        `${n.name} allows public access. Enable "Block Public Access" and serve files via CloudFront with an origin access identity instead.`,
        [n.id],
      )
    }
  }

  // 10. Prefer SSM Session Manager over open SSH.
  const sshNodes = nodes.filter((n) => (n.ports || []).includes(22))
  if (sshNodes.length) {
    add(
      'info',
      'security',
      'Prefer SSM Session Manager over SSH',
      'A component exposes port 22 (SSH). In production, use AWS Systems Manager Session Manager for shell access — no inbound port to open, and every session is audit-logged.',
      sshNodes.map((n) => n.id),
    )
  }

  // ── RELIABILITY / PERFORMANCE / NETWORK / COST ──────────────────

  const computeNodes = nodes.filter(isCompute)

  // 7. Multiple compute nodes but nothing balancing them.
  const hasLb = nodes.some((n) => n.kind === 'lb' || n.kind === 'gateway')
  if (computeNodes.length >= 2 && !hasLb) {
    add(
      'warn',
      'reliability',
      'No load balancer for multiple compute targets',
      'You have more than one compute component but no load balancer. Add one so traffic is distributed and a single instance failing does not take the app down.',
      computeNodes.map((n) => n.id),
    )
  }

  // 8. Single-instance compute = single point of failure.
  for (const n of computeNodes) {
    const instances = n.config?.instances ?? (n.kind === 'serverless' ? 99 : 1)
    if (!n.config?.autoScale && instances <= 1) {
      add(
        'warn',
        'reliability',
        `${n.name} is a single point of failure`,
        `${n.name} runs a single instance with no auto scaling. Use an Auto Scaling Group across multiple AZs for resilience and to handle load spikes.`,
        [n.id],
      )
    }
  }

  // 9. Database without Multi-AZ.
  for (const n of nodes) {
    if (n.kind === 'database' && n.config && 'multiAz' in n.config && !n.config.multiAz) {
      add(
        'info',
        'reliability',
        `${n.name} is not Multi-AZ`,
        `Enable Multi-AZ on ${n.name} so a standby in another availability zone can take over automatically if the primary fails.`,
        [n.id],
      )
    }
  }

  // Automated backups on relational databases.
  for (const n of nodes) {
    if (n.type === 'rds' && n.config && 'backups' in n.config && !n.config.backups) {
      add(
        'warn',
        'reliability',
        `${n.name} has no automated backups`,
        `Enable automated snapshots / point-in-time recovery on ${n.name}, or a failure means permanent data loss.`,
        [n.id],
      )
    }
  }

  // Private compute with no NAT Gateway for outbound traffic.
  const privateCompute = computeNodes.filter((n) => n.tier === 'private')
  const hasNat = nodes.some((n) => n.kind === 'nat')
  if (privateCompute.length && !hasNat) {
    add(
      'warn',
      'network',
      'No NAT Gateway for private subnets',
      'Private instances cannot reach the internet for OS patches, package installs or third-party APIs without a NAT Gateway (or VPC endpoints) for outbound traffic.',
      privateCompute.map((n) => n.id),
    )
  }

  // Burstable dev-size instances under sustained production traffic.
  for (const n of computeNodes) {
    if (n.config?.instanceType === 't3.micro' && !n.config?.autoScale && reachable.has(n.id)) {
      add(
        'info',
        'performance',
        `${n.name} runs on a burstable t3.micro`,
        `t3.micro is a small burstable type — fine for dev, risky for sustained production load. Pick a larger type or enable Auto Scaling, then run a load test to size it.`,
        [n.id],
      )
    }
  }

  // Read path with no cache / CDN.
  const hasDatabase = nodes.some((n) => n.kind === 'database')
  const hasCache = nodes.some((n) => n.kind === 'cache')
  const hasCdn = nodes.some((n) => n.kind === 'cdn')
  if (hasDatabase && reachable.size > 1 && !hasCache && !hasCdn) {
    add(
      'info',
      'performance',
      'No caching layer',
      'Add a CDN for static content and/or an in-memory cache (ElastiCache) in front of the database to cut latency and read load.',
      [],
    )
  }

  // 11. Orphan nodes (placed but wired to nothing).
  for (const n of nodes) {
    if (isInternet(n)) continue
    if ((graph.undirected[n.id] || []).length === 0) {
      add(
        'warn',
        'reliability',
        `${n.name} is not connected`,
        `${n.name} has no connections, so no traffic can reach it. Wire it into the flow or remove it.`,
        [n.id],
      )
    }
  }

  // 12. Services present but no entry point at all.
  if (nodes.length > 0 && !nodes.some(isInternet) && (hasLb || computeNodes.length)) {
    add(
      'info',
      'reliability',
      'No internet entry point',
      'Drop a "Users / Internet" node and connect it to your front door so you can simulate a real request end-to-end.',
      [],
    )
  }

  // ── SCORING ─────────────────────────────────────────────────────
  // Security score penalises security-family findings (incl. IAM + storage);
  // design score penalises everything else (reliability / perf / network / cost).
  const penalty = (keep) =>
    findings.filter(keep).reduce((s, f) => s + (LEVEL_WEIGHT[f.level] || 0), 0)

  const isSecurityCat = (c) => SECURITY_CATS.includes(c)
  const securityScore = clamp(100 - penalty((f) => isSecurityCat(f.category)))
  const designScore = clamp(100 - penalty((f) => !isSecurityCat(f.category)))
  const overall = Math.round((securityScore + designScore) / 2)

  let verdict
  const hasCritical = findings.some((f) => f.level === 'critical')
  if (hasCritical) verdict = { label: 'Insecure', tone: 'bad' }
  else if (overall >= 90) verdict = { label: 'Well-architected', tone: 'good' }
  else if (overall >= 70) verdict = { label: 'Solid, with gaps', tone: 'warn' }
  else verdict = { label: 'Needs work', tone: 'warn' }

  return { findings, securityScore, designScore, overall, verdict }
}

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)))
}

export const FINDING_STYLES = {
  critical: { text: 'text-rose-300', dot: 'bg-rose-500', badge: 'bg-rose-500/15 text-rose-300', label: 'Critical' },
  high: { text: 'text-orange-300', dot: 'bg-orange-500', badge: 'bg-orange-500/15 text-orange-300', label: 'High' },
  warn: { text: 'text-amber-300', dot: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-300', label: 'Warning' },
  info: { text: 'text-sky-300', dot: 'bg-sky-500', badge: 'bg-sky-500/15 text-sky-300', label: 'Tip' },
  ok: { text: 'text-emerald-300', dot: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-300', label: 'OK' },
}
