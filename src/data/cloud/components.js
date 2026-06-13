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
  {
    id: 'client',
    name: 'Client / Frontend',
    short: 'Client',
    icon: '🖥️',
    kind: 'client',
    category: 'Edge & Entry',
    defaultTier: 'public',
    defaultPorts: [443, 80],
    defaultOpenToInternet: true,
    blurb: 'The client-side app / frontend the user reaches first (SPA, web server). It calls the backend API.',
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
  {
    id: 'firewall',
    name: 'Firewall',
    short: 'Firewall',
    icon: '🧱',
    kind: 'waf',
    category: 'Networking & Delivery',
    defaultTier: 'public',
    defaultPorts: [443],
    defaultOpenToInternet: true,
    blurb: 'Network firewall — inspects and filters traffic before it reaches the backend.',
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
    id: 'backend',
    name: 'Backend / API Server',
    short: 'Backend',
    icon: '🧩',
    kind: 'compute',
    category: 'Compute',
    defaultTier: 'private',
    defaultPorts: [8080],
    defaultOpenToInternet: false,
    config: { instances: 2, autoScale: true, maxInstances: 10, instanceType: 't3.medium', iam: 'least' },
    blurb: 'Your application / API server — runs the business logic and talks to the database.',
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

// The catalog is AWS-named by default; the same canonical `kind` powers the
// engines for every provider, so switching cloud only swaps the display label.
export function getComponent(id, provider = 'aws') {
  const base = CATALOG_BY_ID[id]
  if (!base || provider === 'aws') return base
  const alt = PROVIDER_LABELS[id]?.[provider]
  return alt ? { ...base, name: alt[0], short: alt[1] } : base
}

export function providerName(id, provider = 'aws') {
  return getComponent(id, provider)?.name
}

export function getCatalog(provider = 'aws') {
  return COMPONENT_CATALOG.map((c) => getComponent(c.id, provider))
}

export function getCatalogCategories(provider = 'aws') {
  return getCatalog(provider).reduce((acc, c) => {
    ;(acc[c.category] ||= []).push(c)
    return acc
  }, {})
}

// AWS-named grouping (kept for any default consumers).
export const CATALOG_CATEGORIES = getCatalogCategories('aws')

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

// ── Multi-cloud ─────────────────────────────────────────────────
export const CLOUD_PROVIDERS = [
  { id: 'aws', name: 'AWS', tag: 'Amazon', dot: 'bg-orange-400', accent: 'text-orange-300' },
  { id: 'azure', name: 'Azure', tag: 'Microsoft', dot: 'bg-sky-400', accent: 'text-sky-300' },
  { id: 'gcp', name: 'GCP', tag: 'Google Cloud', dot: 'bg-rose-400', accent: 'text-rose-300' },
]

// Per-component [name, short] for Azure & GCP. AWS comes from the catalog.
// Components not listed (users, client) are provider-agnostic.
export const PROVIDER_LABELS = {
  route53: { azure: ['Azure DNS', 'Azure DNS'], gcp: ['Cloud DNS', 'Cloud DNS'] },
  cloudfront: { azure: ['Azure Front Door (CDN)', 'Front Door'], gcp: ['Cloud CDN', 'Cloud CDN'] },
  waf: { azure: ['Azure WAF', 'WAF'], gcp: ['Cloud Armor (WAF)', 'Cloud Armor'] },
  alb: { azure: ['Application Gateway', 'App Gateway'], gcp: ['Cloud Load Balancing', 'Cloud LB'] },
  apigw: { azure: ['API Management', 'API Mgmt'], gcp: ['API Gateway / Apigee', 'API GW'] },
  nat: { azure: ['Azure NAT Gateway', 'NAT'], gcp: ['Cloud NAT', 'Cloud NAT'] },
  firewall: { azure: ['Azure Firewall', 'Firewall'], gcp: ['Cloud Firewall', 'Firewall'] },
  ec2: { azure: ['Virtual Machine', 'Azure VM'], gcp: ['Compute Engine', 'GCE'] },
  backend: { azure: ['App Service', 'App Service'], gcp: ['App Engine / GKE', 'App Engine'] },
  asg: { azure: ['VM Scale Set', 'VMSS'], gcp: ['Managed Instance Group', 'MIG'] },
  ecs: { azure: ['Container Apps', 'Container Apps'], gcp: ['Cloud Run', 'Cloud Run'] },
  lambda: { azure: ['Azure Functions', 'Functions'], gcp: ['Cloud Functions', 'Functions'] },
  rds: { azure: ['Azure SQL Database', 'Azure SQL'], gcp: ['Cloud SQL', 'Cloud SQL'] },
  dynamodb: { azure: ['Cosmos DB', 'Cosmos DB'], gcp: ['Firestore', 'Firestore'] },
  elasticache: { azure: ['Azure Cache for Redis', 'Redis'], gcp: ['Memorystore', 'Memorystore'] },
  s3: { azure: ['Blob Storage', 'Blob'], gcp: ['Cloud Storage', 'GCS'] },
  sqs: { azure: ['Service Bus Queue', 'Service Bus'], gcp: ['Pub/Sub', 'Pub/Sub'] },
}

// One-line cross-cloud feature/cost notes for the comparison view.
export const PROVIDER_COMPARE = {
  route53: 'All three are anycast managed DNS with health checks. Route 53 has the richest routing policies (geo, latency, weighted); pricing is per-zone + per-query and roughly comparable.',
  cloudfront: 'CDNs at the edge. CloudFront integrates tightly with AWS; Front Door bundles a global L7 LB + WAF; Cloud CDN rides Google’s backbone and is cheapest for egress in many regions.',
  waf: 'Managed web firewalls. AWS WAF & Azure WAF are rule-based on the LB/CDN; GCP Cloud Armor adds adaptive DDoS protection and is tied to the global LB.',
  alb: 'L7 load balancing. AWS ALB & Azure App Gateway are regional; GCP’s Cloud Load Balancing is a single global anycast LB (one IP worldwide) — a real differentiator for global apps.',
  apigw: 'API front doors. AWS API Gateway is pay-per-request and serverless-first; Azure API Management is feature-rich (developer portal) but pricier; GCP splits lightweight API Gateway vs full Apigee.',
  nat: 'Outbound NAT for private subnets. Functionally equivalent; all bill an hourly rate + per-GB processed.',
  firewall: 'Network firewalls. Azure Firewall is a managed stateful service; AWS uses Security Groups/Network Firewall; GCP uses VPC firewall rules (free) + Cloud Armor for L7.',
  ec2: 'IaaS VMs, broadly comparable per vCPU/GB. GCP bills per-second with automatic sustained-use discounts; AWS & Azure offer bigger savings via 1–3yr reserved/savings plans.',
  backend: 'App hosting (PaaS). AWS leans on EC2/ECS/Elastic Beanstalk; Azure App Service is the most turnkey PaaS; GCP offers App Engine (PaaS) or GKE (Kubernetes).',
  asg: 'Auto-scaling VM fleets. Equivalent concepts; GCP MIGs and Azure VMSS both support scale-to-zero patterns and rolling updates like AWS ASGs.',
  ecs: 'Containers. AWS ECS/Fargate, Azure Container Apps and GCP Cloud Run are all serverless-container runtimes; Cloud Run is the simplest scale-to-zero, Fargate integrates deepest with AWS.',
  lambda: 'Functions-as-a-Service. All scale to zero and bill per invocation + GB-seconds. Lambda has the largest ecosystem; Cloud Functions/Azure Functions are close peers.',
  rds: 'Managed SQL. AWS Aurora auto-scales storage & is MySQL/Postgres-compatible; Azure SQL is best for SQL Server workloads; Cloud SQL is a simple managed MySQL/Postgres/SQL Server.',
  dynamodb: 'Serverless NoSQL. DynamoDB = key-value, single-digit-ms, pay-per-request; Cosmos DB = multi-model with turnkey global distribution (priciest); Firestore = document store with realtime + mobile SDKs.',
  elasticache: 'Managed Redis/Memcached. Essentially the same engine everywhere; priced by node size/hour. Memorystore and Azure Cache both offer Redis with HA tiers.',
  s3: 'Object storage. S3 is the de-facto standard with the most tiers/features; Blob Storage matches it on Azure; Cloud Storage has a single API across regions. Pricing is per-GB + requests + egress.',
  sqs: 'Async messaging. SQS is simple at-least-once queues; Azure Service Bus adds enterprise features (sessions, topics); GCP Pub/Sub is a global pub/sub bus that also does queues.',
}

// Rows for the cross-cloud comparison table.
export function getProviderComparison() {
  return COMPONENT_CATALOG.filter((c) => c.kind !== 'internet' && c.kind !== 'client').map((c) => ({
    category: c.category,
    icon: c.icon,
    kind: c.kind,
    aws: c.name,
    azure: PROVIDER_LABELS[c.id]?.azure?.[0] || c.name,
    gcp: PROVIDER_LABELS[c.id]?.gcp?.[0] || c.name,
    note: PROVIDER_COMPARE[c.id] || '',
  }))
}
export const PUBLIC_ENTRY_KINDS = ['lb', 'gateway', 'cdn']
