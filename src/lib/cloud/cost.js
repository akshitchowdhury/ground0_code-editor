// Rough monthly cost estimator for Ground0: Cloud — Architecture Studio.
//
// estimateCost({ nodes }, { rps, instanceCounts }) -> { items, total }
//   rps            : request rate to scale per-request charges (0 = provisioned only)
//   instanceCounts : optional { nodeId: n } override from the load test (scaled fleet)
//
// Illustrative only — see specs.js. The point is to show beginners that design
// choices have a price, and that scaling up costs money.
import {
  HOURS_PER_MONTH, SECONDS_PER_MONTH, PRICING,
  instanceHourly, dbHourly, cacheHourly,
} from './specs.js'

function nodeMonthly(node, rps, instances) {
  const reqM = (rps * SECONDS_PER_MONTH) / 1e6 // millions of requests / month
  const c = node.config || {}
  switch (node.kind) {
    case 'compute':
    case 'container': {
      const monthly = instances * instanceHourly(c.instanceType) * HOURS_PER_MONTH
      return { monthly, detail: `${instances}× ${c.instanceType || 'instance'}` }
    }
    case 'serverless':
      return { monthly: reqM * PRICING.lambdaPerMillionReq, detail: 'pay per invocation' }
    case 'database': {
      const replicas = c.readReplicas || 0
      const azMult = c.multiAz ? 2 : 1
      const monthly = dbHourly(c.dbClass) * HOURS_PER_MONTH * (azMult + replicas)
      const parts = [c.dbClass || 'db']
      if (c.multiAz) parts.push('Multi-AZ')
      if (replicas) parts.push(`${replicas} replica${replicas > 1 ? 's' : ''}`)
      return { monthly, detail: parts.join(' · ') }
    }
    case 'cache':
      return { monthly: cacheHourly(c.cacheType) * HOURS_PER_MONTH, detail: c.cacheType || 'cache node' }
    case 'lb':
      return { monthly: PRICING.albMonthly + reqM * PRICING.albPerMillionReq, detail: 'ALB + LCUs' }
    case 'gateway':
      return { monthly: reqM * PRICING.apigwPerMillionReq, detail: 'per million requests' }
    case 'cdn':
      return { monthly: reqM * PRICING.cdnPerMillionReq, detail: 'requests + transfer' }
    case 'client':
      return { monthly: 10 + reqM * 0.4, detail: 'frontend hosting + requests' }
    case 'waf':
      return { monthly: PRICING.wafMonthly + reqM * PRICING.wafPerMillionReq, detail: 'WAF + requests' }
    case 'nat':
      return { monthly: PRICING.natMonthly + reqM * PRICING.natPerMillionReq, detail: 'gateway + data' }
    case 'dns':
      return { monthly: PRICING.dnsMonthly + reqM * PRICING.dnsPerMillionReq, detail: 'hosted zone + queries' }
    case 'storage':
      return { monthly: PRICING.s3Monthly + reqM * PRICING.s3PerMillionReq, detail: 'storage + requests' }
    case 'queue':
      return { monthly: reqM * PRICING.sqsPerMillionReq, detail: 'per million messages' }
    default:
      return { monthly: 0, detail: 'no charge' }
  }
}

export function estimateCost({ nodes = [] }, { rps = 0, instanceCounts = {} } = {}) {
  const items = nodes
    .filter((n) => n.kind !== 'internet')
    .map((n) => {
      const instances = instanceCounts[n.id] ?? n.config?.instances ?? 1
      const { monthly, detail } = nodeMonthly(n, rps, instances)
      return { id: n.id, name: n.label || n.name, icon: n.icon, kind: n.kind, monthly, detail }
    })
    .sort((a, b) => b.monthly - a.monthly)
  const total = items.reduce((s, i) => s + i.monthly, 0)
  return { items, total }
}
