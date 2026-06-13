// Ground0: Cloud — Architecture Studio component catalog.
// Each entry is a draggable cloud component. `kind` drives the rules engine
// (src/lib/cloud/analyze.js) and the flow simulator (src/lib/cloud/simulate.js);
// `defaultTier` / `defaultPorts` seed the node's security group when dropped.
//
// tiers: 'internet' (the public client) · 'edge' (CDN/DNS/WAF/IGW, AWS-managed
// edge) · 'public' (public subnet — load balancers, NAT) · 'private' (private
// subnet — app + data tiers, never directly internet-facing).

export const COMPONENT_CATALOG = [
  // ── Edge & entry ────────────────────────────────────────────────
  {
    id: 'users',
    name: 'Users / Internet',
    short: 'Internet',
    icon: '🌐',
    kind: 'internet',
    category: 'Edge & Entry',
    defaultTier: 'internet',
    defaultPorts: [],
    defaultOpenToInternet: true,
    blurb: 'The public clients hitting your system. Every request starts here.',
  },
  {
    id: 'route53',
    name: 'Route 53 (DNS)',
    short: 'DNS',
    icon: '🧭',
    kind: 'dns',
    category: 'Edge & Entry',
    defaultTier: 'edge',
    defaultPorts: [53, 443],
    defaultOpenToInternet: true,
    blurb: 'Managed DNS — resolves your domain to the nearest entry point.',
  },
  {
    id: 'cloudfront',
    name: 'CloudFront (CDN)',
    short: 'CDN',
    icon: '🛰️',
    kind: 'cdn',
    category: 'Edge & Entry',
    defaultTier: 'edge',
    defaultPorts: [443],
    defaultOpenToInternet: true,
    blurb: 'Global CDN — caches static content at the edge, close to users.',
  },
  {
    id: 'waf',
    name: 'Web Application Firewall',
    short: 'WAF',
    icon: '🛡️',
    kind: 'waf',
    category: 'Edge & Entry',
    defaultTier: 'edge',
    defaultPorts: [443],
    defaultOpenToInternet: true,
    blurb: 'Filters malicious traffic (SQLi, XSS, bad bots) before it reaches you.',
  },

  // ── Networking & delivery ───────────────────────────────────────
  {
    id: 'alb',
    name: 'Application Load Balancer',
    short: 'ALB',
    icon: '⚖️',
    kind: 'lb',
    category: 'Networking & Delivery',
    defaultTier: 'public',
    defaultPorts: [443, 80],
    defaultOpenToInternet: true,
    blurb: 'Spreads traffic across healthy compute targets and terminates TLS.',
  },
  {
    id: 'apigw',
    name: 'API Gateway',
    short: 'API GW',
    icon: '⇄',
    kind: 'gateway',
    category: 'Networking & Delivery',
    defaultTier: 'public',
    defaultPorts: [443],
    defaultOpenToInternet: true,
    blurb: 'Managed front door for APIs — auth, throttling, routing to backends.',
  },
  {
    id: 'nat',
    name: 'NAT Gateway',
    short: 'NAT',
    icon: '🔀',
    kind: 'nat',
    category: 'Networking & Delivery',
    defaultTier: 'public',
    defaultPorts: [],
    defaultOpenToInternet: false,
    blurb: 'Lets private-subnet resources reach the internet for outbound only.',
  },

  // ── Compute ─────────────────────────────────────────────────────
  {
    id: 'ec2',
    name: 'EC2 Instance',
    short: 'EC2',
    icon: '🖥️',
    kind: 'compute',
    category: 'Compute',
    defaultTier: 'private',
    defaultPorts: [8080],
    defaultOpenToInternet: false,
    config: { instances: 1, autoScale: false, maxInstances: 4, instanceType: 't3.micro', iam: 'least' },
    blurb: 'A virtual server running your application code.',
  },
  {
    id: 'asg',
    name: 'Auto Scaling Group',
    short: 'ASG',
    icon: '📈',
    kind: 'compute',
    category: 'Compute',
    defaultTier: 'private',
    defaultPorts: [8080],
    defaultOpenToInternet: false,
    config: { instances: 3, autoScale: true, maxInstances: 12, instanceType: 't3.medium', iam: 'least' },
    blurb: 'A fleet of instances that scales out under load across AZs.',
  },
  {
    id: 'ecs',
    name: 'ECS / Fargate',
    short: 'ECS',
    icon: '📦',
    kind: 'container',
    category: 'Compute',
    defaultTier: 'private',
    defaultPorts: [8080],
    defaultOpenToInternet: false,
    config: { instances: 2, autoScale: true, maxInstances: 10, instanceType: 't3.small', iam: 'least' },
    blurb: 'Containerised services on managed compute — no servers to patch.',
  },
  {
    id: 'lambda',
    name: 'Lambda Function',
    short: 'Lambda',
    icon: 'ƛ',
    kind: 'serverless',
    category: 'Compute',
    defaultTier: 'private',
    defaultPorts: [443],
    defaultOpenToInternet: false,
    config: { autoScale: true, iam: 'least' },
    blurb: 'Event-driven functions — scale to zero, pay per invocation.',
  },

  // ── Data & storage ──────────────────────────────────────────────
  {
    id: 'rds',
    name: 'RDS Database',
    short: 'RDS',
    icon: '🗄️',
    kind: 'database',
    category: 'Data & Storage',
    defaultTier: 'private',
    defaultPorts: [5432],
    defaultOpenToInternet: false,
    config: { multiAz: false, dbClass: 'db.t3.medium', readReplicas: 0, encrypted: false, backups: false },
    blurb: 'Managed relational database (Postgres/MySQL). Keep it private.',
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    short: 'DynamoDB',
    icon: '⚡',
    kind: 'database',
    category: 'Data & Storage',
    defaultTier: 'private',
    defaultPorts: [443],
    defaultOpenToInternet: false,
    config: { multiAz: true, encrypted: true },
    blurb: 'Serverless key-value store — single-digit-ms reads at any scale.',
  },
  {
    id: 'elasticache',
    name: 'ElastiCache (Redis)',
    short: 'Cache',
    icon: '🧊',
    kind: 'cache',
    category: 'Data & Storage',
    defaultTier: 'private',
    defaultPorts: [6379],
    defaultOpenToInternet: false,
    config: { cacheType: 'cache.t3.micro', encrypted: false },
    blurb: 'In-memory cache — absorbs read load so the database stays fast.',
  },
  {
    id: 's3',
    name: 'S3 Bucket',
    short: 'S3',
    icon: '🪣',
    kind: 'storage',
    category: 'Data & Storage',
    defaultTier: 'private',
    defaultPorts: [443],
    defaultOpenToInternet: false,
    config: { encrypted: false, versioning: false, public: false },
    blurb: 'Object storage for static assets, uploads and backups.',
  },
  {
    id: 'sqs',
    name: 'SQS Queue',
    short: 'SQS',
    icon: '📨',
    kind: 'queue',
    category: 'Data & Storage',
    defaultTier: 'private',
    defaultPorts: [443],
    defaultOpenToInternet: false,
    blurb: 'Message queue that decouples producers from slow consumers.',
  },
]

export const CATALOG_BY_ID = Object.fromEntries(COMPONENT_CATALOG.map((c) => [c.id, c]))

export function getComponent(id) {
  return CATALOG_BY_ID[id]
}

// Palette grouping for the sidebar (preserves catalog order within a group).
export const CATALOG_CATEGORIES = COMPONENT_CATALOG.reduce((acc, c) => {
  ;(acc[c.category] ||= []).push(c)
  return acc
}, {})

// Human labels + colours for the four network tiers.
export const TIERS = {
  internet: { label: 'Internet', hint: 'Public clients', color: 'text-sky-300' },
  edge: { label: 'Edge', hint: 'AWS-managed edge (CDN/DNS/WAF)', color: 'text-violet-300' },
  public: { label: 'Public subnet', hint: 'Internet-facing (LB, NAT)', color: 'text-amber-300' },
  private: { label: 'Private subnet', hint: 'No direct internet access', color: 'text-emerald-300' },
}

// Common ports offered as quick-toggles in the inspector.
export const COMMON_PORTS = [
  { port: 443, label: 'HTTPS' },
  { port: 80, label: 'HTTP' },
  { port: 22, label: 'SSH' },
  { port: 3389, label: 'RDP' },
  { port: 5432, label: 'Postgres' },
  { port: 3306, label: 'MySQL' },
  { port: 6379, label: 'Redis' },
  { port: 8080, label: 'App' },
]

// Ports that must never be open to 0.0.0.0/0.
export const SENSITIVE_PORTS = {
  22: 'SSH',
  3389: 'RDP',
  3306: 'MySQL',
  5432: 'Postgres',
  1433: 'SQL Server',
  27017: 'MongoDB',
  6379: 'Redis',
}

// Stateful data tiers that should always live in a private subnet.
export const STATEFUL_KINDS = ['database', 'cache']
export const COMPUTE_KINDS = ['compute', 'container', 'serverless']
export const PUBLIC_ENTRY_KINDS = ['lb', 'gateway', 'cdn']
