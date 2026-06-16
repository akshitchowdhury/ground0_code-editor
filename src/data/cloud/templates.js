// Starter architectures for the Architecture Studio. `build()` returns fresh
// node/edge objects each call so the canvas can mutate them freely.

function node(id, type, kind, name, icon, x, y, tier, ports, open, config) {
  return { id, type, kind, name, icon, x, y, tier, ports: [...ports], openToInternet: !!open, config: { ...config } }
}

export const TEMPLATES = [
  {
    id: 'end-to-end',
    name: 'End-to-end request flow',
    desc: 'The full cycle: User → Client → Load Balancer → Firewall → Backend → Database, and the response back. Run a load test to watch it scale or break.',
    build: () => ({
      nodes: [
        node('u', 'users', 'internet', 'Users / Internet', '🌐', 40, 300, 'internet', [], true, {}),
        node('c', 'client', 'client', 'Client / Frontend', '🖥️', 220, 300, 'public', [443, 80], true, {}),
        node('lb', 'alb', 'lb', 'Load Balancer', '⚖️', 410, 300, 'public', [443, 80], true, {}),
        node('fw', 'firewall', 'waf', 'Firewall', '🧱', 600, 300, 'public', [443], true, {}),
        node('be', 'backend', 'compute', 'Backend / API', '🧩', 790, 300, 'private', [8080], false, { instances: 2, autoScale: true, maxInstances: 10, instanceType: 't3.medium', iam: 'least' }),
        node('db', 'rds', 'database', 'Database', '🗄️', 990, 220, 'private', [5432], false, { multiAz: true, dbClass: 'db.r5.large', readReplicas: 1, encrypted: true, backups: true }),
        node('ca', 'elasticache', 'cache', 'Cache', '🧊', 990, 400, 'private', [6379], false, { cacheType: 'cache.t3.micro', encrypted: true }),
      ],
      edges: [
        { id: 'x1', from: 'u', to: 'c', port: 443 },
        { id: 'x2', from: 'c', to: 'lb', port: 443 },
        { id: 'x3', from: 'lb', to: 'fw', port: 443 },
        { id: 'x4', from: 'fw', to: 'be', port: 8080 },
        { id: 'x5', from: 'be', to: 'db', port: 5432 },
        { id: 'x6', from: 'be', to: 'ca', port: 6379 },
      ],
    }),
  },
  {
    id: 'secure-3tier',
    name: 'Secure 3-tier web app',
    desc: 'Internet → CDN → WAF → ALB → Auto Scaling app → Multi-AZ DB + cache. The well-architected baseline.',
    build: () => ({
      nodes: [
        node('t-users', 'users', 'internet', 'Users / Internet', '🌐', 40, 360, 'internet', [], true, {}),
        node('t-cdn', 'cloudfront', 'cdn', 'CloudFront', '🛰️', 220, 360, 'edge', [443], true, {}),
        node('t-waf', 'waf', 'waf', 'WAF', '🛡️', 400, 360, 'edge', [443], true, {}),
        node('t-alb', 'alb', 'lb', 'App Load Balancer', '⚖️', 580, 360, 'public', [443, 80], true, {}),
        node('t-asg', 'asg', 'compute', 'Auto Scaling Group', '📈', 770, 360, 'private', [8080], false, {
          instances: 3, autoScale: true, maxInstances: 12, instanceType: 't3.medium', iam: 'least',
        }),
        node('t-rds', 'rds', 'database', 'RDS (Multi-AZ)', '🗄️', 980, 280, 'private', [5432], false, {
          multiAz: true, dbClass: 'db.r5.large', readReplicas: 1, encrypted: true, backups: true,
        }),
        node('t-cache', 'elasticache', 'cache', 'ElastiCache', '🧊', 980, 470, 'private', [6379], false, {
          cacheType: 'cache.t3.micro', encrypted: true,
        }),
        node('t-nat', 'nat', 'nat', 'NAT Gateway', '🔀', 770, 180, 'public', [], false, {}),
      ],
      edges: [
        { id: 't-e1', from: 't-users', to: 't-cdn', port: 443 },
        { id: 't-e2', from: 't-cdn', to: 't-waf', port: 443 },
        { id: 't-e3', from: 't-waf', to: 't-alb', port: 443 },
        { id: 't-e4', from: 't-alb', to: 't-asg', port: 8080 },
        { id: 't-e5', from: 't-asg', to: 't-rds', port: 5432 },
        { id: 't-e6', from: 't-asg', to: 't-cache', port: 6379 },
        { id: 't-e7', from: 't-asg', to: 't-nat', port: 443 },
      ],
    }),
  },
  {
    id: 'insecure',
    name: 'Insecure — fix me',
    desc: 'A single public EC2 with SSH open, an admin IAM role, and an unencrypted public database on a blocked port. Run the review and a load test to see everything that breaks.',
    build: () => ({
      nodes: [
        node('b-users', 'users', 'internet', 'Users / Internet', '🌐', 60, 320, 'internet', [], true, {}),
        node('b-ec2', 'ec2', 'compute', 'EC2 (public)', '🖥️', 360, 320, 'public', [22, 8080], true, {
          instances: 1, autoScale: false, maxInstances: 4, instanceType: 't3.micro', iam: 'admin',
        }),
        node('b-rds', 'rds', 'database', 'RDS (public)', '🗄️', 680, 320, 'public', [5432], true, {
          multiAz: false, dbClass: 'db.t3.micro', readReplicas: 0, encrypted: false, backups: false,
        }),
      ],
      edges: [
        { id: 'b-e1', from: 'b-users', to: 'b-ec2', port: 8080 },
        // Intentionally wrong: app talks MySQL (3306) but the DB only allows Postgres (5432).
        { id: 'b-e2', from: 'b-ec2', to: 'b-rds', port: 3306 },
      ],
    }),
  },
  {
    id: 'nat-egress',
    name: 'Private egress via NAT',
    desc: 'A private backend serves user requests AND reaches the internet outbound through a NAT Gateway — to install packages and call third-party APIs. Inbound from the internet stays blocked. Run the flow to watch the one-way egress.',
    build: () => ({
      nodes: [
        node('g-users', 'users', 'internet', 'Users / Internet', '🌐', 40, 340, 'internet', [], true, {}),
        node('g-alb', 'alb', 'lb', 'Load Balancer', '⚖️', 250, 340, 'public', [443, 80], true, {}),
        node('g-be', 'backend', 'compute', 'Backend / API', '🧩', 480, 340, 'private', [8080], false, {
          instances: 2, autoScale: true, maxInstances: 10, instanceType: 't3.medium', iam: 'least',
        }),
        node('g-rds', 'rds', 'database', 'RDS Database', '🗄️', 720, 340, 'private', [5432], false, {
          multiAz: true, dbClass: 'db.r5.large', readReplicas: 1, encrypted: true, backups: true,
        }),
        node('g-nat', 'nat', 'nat', 'NAT Gateway', '🔀', 480, 160, 'public', [], false, {}),
      ],
      edges: [
        { id: 'g-e1', from: 'g-users', to: 'g-alb', port: 443 },
        { id: 'g-e2', from: 'g-alb', to: 'g-be', port: 8080 },
        { id: 'g-e3', from: 'g-be', to: 'g-rds', port: 5432 },
        // Outbound only: the private backend egresses to the internet via the NAT.
        { id: 'g-e4', from: 'g-be', to: 'g-nat', port: 443 },
        { id: 'g-e5', from: 'g-nat', to: 'g-users', port: 443 },
      ],
    }),
  },
  {
    id: 'serverless-api',
    name: 'Serverless API',
    desc: 'API Gateway → Lambda → DynamoDB. Scales to zero, nothing to patch, pay per request.',
    build: () => ({
      nodes: [
        node('s-users', 'users', 'internet', 'Users / Internet', '🌐', 60, 320, 'internet', [], true, {}),
        node('s-api', 'apigw', 'gateway', 'API Gateway', '⇄', 320, 320, 'public', [443], true, {}),
        node('s-fn', 'lambda', 'serverless', 'Lambda', 'ƛ', 560, 320, 'private', [443], false, { autoScale: true, iam: 'least' }),
        node('s-db', 'dynamodb', 'database', 'DynamoDB', '⚡', 800, 320, 'private', [443], false, { multiAz: true, encrypted: true }),
      ],
      edges: [
        { id: 's-e1', from: 's-users', to: 's-api', port: 443 },
        { id: 's-e2', from: 's-api', to: 's-fn', port: 443 },
        { id: 's-e3', from: 's-fn', to: 's-db', port: 443 },
      ],
    }),
  },
]

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id)
}
