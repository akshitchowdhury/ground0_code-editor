// Capacity + pricing reference for Ground0: Cloud — Architecture Studio.
// Numbers are deliberately ROUGH and rounded for teaching — order-of-magnitude
// realistic (on-demand, us-east-1-ish), not a billing quote. They let beginners
// feel the trade-offs: bigger/more instances cost more, serverless scales with
// usage, single nodes saturate under load.

export const HOURS_PER_MONTH = 730
export const SECONDS_PER_MONTH = 2_592_000

// Compute instance types: sustained requests/sec a single instance handles, and
// on-demand $/hour.
export const INSTANCE_TYPES = {
  't3.micro': { label: 't3.micro', rps: 250, hourly: 0.0104, note: 'burstable, dev-size' },
  't3.small': { label: 't3.small', rps: 500, hourly: 0.0208, note: 'burstable' },
  't3.medium': { label: 't3.medium', rps: 1000, hourly: 0.0416, note: 'burstable' },
  't3.large': { label: 't3.large', rps: 2000, hourly: 0.0832, note: 'burstable' },
  'm5.large': { label: 'm5.large', rps: 3000, hourly: 0.096, note: 'general purpose' },
  'm5.xlarge': { label: 'm5.xlarge', rps: 6000, hourly: 0.192, note: 'general purpose' },
  'c5.large': { label: 'c5.large', rps: 4000, hourly: 0.085, note: 'compute optimized' },
  'c5.xlarge': { label: 'c5.xlarge', rps: 8000, hourly: 0.17, note: 'compute optimized' },
}
export const COMPUTE_TYPE_OPTIONS = Object.keys(INSTANCE_TYPES)

// Relational DB classes: sustained queries/sec (single writer) and $/hour.
export const DB_CLASSES = {
  'db.t3.micro': { label: 'db.t3.micro', qps: 400, hourly: 0.017 },
  'db.t3.medium': { label: 'db.t3.medium', qps: 1500, hourly: 0.068 },
  'db.r5.large': { label: 'db.r5.large', qps: 6000, hourly: 0.24 },
  'db.r5.xlarge': { label: 'db.r5.xlarge', qps: 12000, hourly: 0.48 },
  'db.r5.2xlarge': { label: 'db.r5.2xlarge', qps: 24000, hourly: 0.96 },
}
export const DB_CLASS_OPTIONS = Object.keys(DB_CLASSES)

export const CACHE_TYPES = {
  'cache.t3.micro': { label: 'cache.t3.micro', hourly: 0.017 },
  'cache.r5.large': { label: 'cache.r5.large', hourly: 0.21 },
}
export const CACHE_TYPE_OPTIONS = Object.keys(CACHE_TYPES)

// Per-request / per-GB rates and fixed monthly charges.
export const PRICING = {
  albMonthly: 16.43,
  albPerMillionReq: 0.008 * 1, // ~LCU approximation
  natMonthly: 32.4,
  natPerMillionReq: 0.6, // rough data-processing proxy
  apigwPerMillionReq: 3.5,
  cdnPerMillionReq: 0.9, // requests + transfer, rough
  wafMonthly: 5.0,
  wafPerMillionReq: 0.6,
  lambdaPerMillionReq: 0.6, // invokes + GB-seconds, rough
  dynamoPerMillionReq: 1.25, // on-demand
  s3Monthly: 1.5, // ~50 GB stored
  s3PerMillionReq: 0.4,
  sqsPerMillionReq: 0.4,
  dnsMonthly: 0.5,
  dnsPerMillionReq: 0.4,
}

// Behavioural constants for the capacity model.
export const CACHE_HIT_RATIO = 0.8 // share of reads a cache absorbs before the DB
export const CDN_OFFLOAD = 0.45 // share of traffic a CDN serves from the edge
export const BASE_LATENCY_MS = 35 // healthy round-trip baseline

export const instanceRps = (type) => INSTANCE_TYPES[type]?.rps ?? 500
export const instanceHourly = (type) => INSTANCE_TYPES[type]?.hourly ?? 0.05
export const dbQps = (cls) => DB_CLASSES[cls]?.qps ?? 1500
export const dbHourly = (cls) => DB_CLASSES[cls]?.hourly ?? 0.07
export const cacheHourly = (t) => CACHE_TYPES[t]?.hourly ?? 0.017

// Next size up — used by the load test's one-click "upgrade" recommendations.
export function nextType(type) {
  const i = COMPUTE_TYPE_OPTIONS.indexOf(type)
  return i >= 0 && i < COMPUTE_TYPE_OPTIONS.length - 1 ? COMPUTE_TYPE_OPTIONS[i + 1] : null
}
export function nextDbClass(cls) {
  const i = DB_CLASS_OPTIONS.indexOf(cls)
  return i >= 0 && i < DB_CLASS_OPTIONS.length - 1 ? DB_CLASS_OPTIONS[i + 1] : null
}

// Traffic presets offered in the load-test panel (req/s + a friendly label).
export const TRAFFIC_PRESETS = [
  { rps: 100, label: 'Launch day', sub: '~100 req/s' },
  { rps: 1000, label: 'Growing', sub: '~1k req/s' },
  { rps: 10000, label: 'Popular', sub: '~10k req/s' },
  { rps: 50000, label: 'Viral spike', sub: '~50k req/s' },
  { rps: 200000, label: 'Black Friday', sub: '~200k req/s' },
]

export const fmtRps = (rps) => (rps >= 1000 ? `${(rps / 1000).toFixed(rps % 1000 ? 1 : 0)}k` : `${rps}`)
export const fmtUsd = (n) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : n >= 1 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`
