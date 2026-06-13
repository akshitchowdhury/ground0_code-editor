// Cloud Computing & AWS — lessons with flow boards and concept card grids.

export default [
  {
    id: 'what-is-cloud',
    title: 'What Is Cloud Computing?',
    summary: 'Renting compute by the second — and why everyone does it.',
    blocks: [
      {
        type: 'p',
        text: '**Cloud computing** is on-demand access to computing resources — servers, storage, databases, networking — over the internet, paid as you go. Instead of buying machines, you rent slices of someone else’s enormous, automated data centers.',
      },
      {
        type: 'list',
        items: [
          '**On-demand & self-service** — an API call provisions a server in seconds.',
          '**Elasticity** — scale out for the spike, scale in after; pay only for what runs.',
          '**Global reach** — deploy to Sydney or Frankfurt in minutes.',
          '**Managed services** — databases, queues, ML models offered as ready services.',
        ],
      },
      { type: 'h3', text: 'Regions and Availability Zones' },
      {
        type: 'p',
        text: 'Providers organize the world into **Regions** (e.g. `us-east-1`), each containing multiple isolated **Availability Zones** — separate data centers with independent power and networking. Spreading across AZs is how cloud apps survive a data-center failure.',
      },
      {
        type: 'p',
        text: 'Under it all is **virtualization**: one physical server runs many isolated virtual machines, which is what makes renting "part of a computer" possible.',
      },
    ],
    cards: {
      title: 'The 6 big advantages of cloud',
      items: [
        { icon: '💸', title: 'CapEx → OpEx', text: 'Trade buying servers (capital expense) for pay-as-you-go (variable expense).' },
        { icon: '🏷️', title: 'Economies of scale', text: 'AWS buys hardware by the million — lower unit prices than any single company.' },
        { icon: '📏', title: 'Stop guessing capacity', text: 'Scale with real demand instead of forecasting hardware two years ahead.' },
        { icon: '⚡', title: 'Speed & agility', text: 'New environments in minutes turn experiments from months into afternoons.' },
        { icon: '🔧', title: 'No data-center toil', text: 'Racking, cooling and hardware repair become someone else’s job.' },
        { icon: '🌍', title: 'Go global in minutes', text: 'Deploy near your users on every continent with a few API calls.' },
      ],
    },
  },

  {
    id: 'service-models',
    title: 'IaaS, PaaS, SaaS & Shared Responsibility',
    summary: 'Who manages what — the model behind every cloud security question.',
    blocks: [
      {
        type: 'p',
        text: 'Cloud offerings differ by **how much the provider manages for you**. The more they manage, the less you control — and the less you can get wrong.',
      },
      {
        type: 'list',
        items: [
          '**IaaS** (Infrastructure) — you rent VMs, disks, networks. You manage OS and up. *EC2*.',
          '**PaaS** (Platform) — you bring code; the platform runs it. *Elastic Beanstalk, Heroku*.',
          '**FaaS / Serverless** — you bring functions; everything else is invisible. *Lambda*.',
          '**SaaS** (Software) — you just use the app. *Gmail, Salesforce*.',
        ],
      },
      { type: 'h3', text: 'The Shared Responsibility Model' },
      {
        type: 'p',
        text: 'AWS secures **the cloud** (facilities, hardware, hypervisor). You secure what you put **in the cloud** (data, IAM, network rules, OS patching on IaaS). Misconfigured customer settings — public S3 buckets, over-permissive IAM — cause far more breaches than provider failures. Exam favorite: *who patches what?* On EC2: you. On Lambda/RDS: AWS patches the platform; your code and data remain yours.',
      },
      {
        type: 'list',
        items: [
          '**Deployment models** — public cloud (AWS/Azure/GCP), private cloud (your own), **hybrid** (both, connected via VPN/Direct Connect).',
        ],
      },
    ],
    cards: {
      title: 'Who manages what?',
      items: [
        { icon: '🏢', title: 'On-premises', text: 'You manage everything: building, power, hardware, OS, runtime, app, data.' },
        { icon: '🧱', title: 'IaaS — EC2', text: 'AWS: hardware & hypervisor. You: OS, patches, runtime, app, data, firewall rules.' },
        { icon: '🚀', title: 'PaaS — Beanstalk', text: 'AWS: OS & runtime too. You: your code, your data, service configuration.' },
        { icon: 'λ', title: 'Serverless — Lambda', text: 'AWS: everything up to the runtime. You: function code, permissions, data.' },
        { icon: '📬', title: 'SaaS — Gmail', text: 'Provider runs the whole app. You: your account, your content, access control.' },
        { icon: '🛡️', title: 'Always yours', text: 'In every model: your data, your identities (IAM), your access decisions.' },
      ],
    },
  },

  {
    id: 'aws-core',
    title: 'The AWS Core Services Tour',
    summary: 'The ten services that appear in every architecture and every exam.',
    blocks: [
      {
        type: 'p',
        text: 'AWS has 200+ services; real architectures (and exams) revolve around a core dozen. Learn these cold and unfamiliar services become "like X, but for Y".',
      },
      {
        type: 'list',
        items: [
          '**EC2** — virtual machines. **Lambda** — run functions without servers.',
          '**S3** — object storage (files, backups, static sites; 11 nines durability). **EBS** — disks for EC2.',
          '**RDS** — managed SQL (Postgres/MySQL). **DynamoDB** — serverless NoSQL at any scale.',
          '**VPC** — your private network. **Route 53** — DNS. **CloudFront** — global CDN.',
          '**IAM** — who can do what. **CloudWatch** — metrics, logs, alarms. **SQS/SNS** — queues & pub/sub.',
        ],
      },
      { type: 'h3', text: 'How to think about service choice' },
      {
        type: 'p',
        text: 'Exam questions are usually "match the requirement to the service": *managed relational DB with failover* → RDS Multi-AZ; *static website, cheap* → S3 + CloudFront; *spiky event processing* → Lambda + SQS; *strict latency at massive scale* → DynamoDB.',
      },
    ],
    cards: {
      title: 'Core services cheat sheet',
      items: [
        { icon: '🖥️', title: 'EC2', text: 'Resizable virtual servers. Pricing: On-Demand, Reserved/Savings Plans, Spot.' },
        { icon: '🪣', title: 'S3', text: 'Infinite object storage with storage classes from Standard to Glacier Deep Archive.' },
        { icon: 'λ', title: 'Lambda', text: 'Event-driven functions, billed per millisecond. Zero servers to manage.' },
        { icon: '🗄️', title: 'RDS / Aurora', text: 'Managed SQL: backups, patching, Multi-AZ failover, read replicas.' },
        { icon: '⚡', title: 'DynamoDB', text: 'Key-value NoSQL with single-digit-ms latency at any request volume.' },
        { icon: '🕸️', title: 'VPC', text: 'Your software-defined network: subnets, route tables, gateways, security groups.' },
        { icon: '🔑', title: 'IAM', text: 'Users, groups, roles and policies. Least privilege; roles > access keys.' },
        { icon: '📈', title: 'CloudWatch', text: 'Metrics, logs, dashboards and alarms — the eyes of your architecture.' },
        { icon: '📨', title: 'SQS / SNS', text: 'Queues to decouple services; topics to fan out events to many subscribers.' },
      ],
    },
  },

  {
    id: 'vpc-request-flow',
    title: 'A Request Through a Real AWS Architecture',
    summary: 'Route 53 → ALB → EC2 → RDS: the classic three-tier VPC, animated.',
    blocks: [
      {
        type: 'p',
        text: 'This is the bread-and-butter AWS web architecture: a **VPC** split into public and private subnets across two AZs, a load balancer up front, app servers in the middle, a database at the back.',
      },
      {
        type: 'list',
        items: [
          '**Public subnet** — has a route to the Internet Gateway; hosts the ALB and NAT.',
          '**Private subnets** — no inbound internet route; apps and DB live here.',
          '**ALB** — spreads traffic across healthy instances in multiple AZs.',
          '**Auto Scaling group** — adds/removes EC2 instances with demand.',
          '**RDS Multi-AZ** — synchronous standby in the other AZ; automatic failover.',
        ],
      },
      { type: 'h3', text: 'Security posture' },
      {
        type: 'p',
        text: 'Security groups chain the tiers: ALB accepts `443` from the world; app instances accept `8080` **only from the ALB’s security group**; RDS accepts `5432` **only from the app tier**. Nothing private is reachable from the internet — verify it on the board.',
      },
    ],
    flow: {
      title: 'Three-tier VPC request flow',
      w: 760,
      h: 430,
      nodes: [
        { id: 'user', x: 12, y: 175, icon: '🧑', label: 'User', sub: 'shop.dev', w: 96 },
        { id: 'dns', x: 150, y: 40, icon: '🗺️', label: 'Route 53', sub: 'DNS' },
        { id: 'igw', x: 150, y: 175, icon: '🚪', label: 'Internet GW', sub: 'VPC edge' },
        { id: 'alb', x: 320, y: 175, icon: '⚖️', label: 'ALB', sub: 'public subnets' },
        { id: 'ec2a', x: 500, y: 60, icon: '🖥️', label: 'EC2 (AZ-a)', sub: 'private subnet' },
        { id: 'ec2b', x: 500, y: 290, icon: '🖥️', label: 'EC2 (AZ-b)', sub: 'private subnet' },
        { id: 'rds', x: 648, y: 175, icon: '🗄️', label: 'RDS', sub: 'Multi-AZ', w: 100 },
      ],
      edges: [
        { from: 'user', to: 'dns', dashed: true, label: '1. resolve' },
        { from: 'user', to: 'igw', label: 'HTTPS' },
        { from: 'igw', to: 'alb' },
        { from: 'alb', to: 'ec2a', label: ':8080' },
        { from: 'alb', to: 'ec2b', label: ':8080' },
        { from: 'ec2a', to: 'rds', label: ':5432' },
        { from: 'ec2b', to: 'rds', label: ':5432' },
      ],
      steps: [
        {
          from: 'user',
          to: 'dns',
          packet: 'shop.dev?',
          text: 'Route 53 resolves shop.dev to the ALB’s public address (an alias record). Health-check-aware DNS can even route around a sick region.',
        },
        {
          from: 'user',
          to: 'igw',
          packet: 'HTTPS :443',
          text: 'The request enters the VPC through the Internet Gateway — the only door between this network and the internet.',
        },
        {
          from: 'igw',
          to: 'alb',
          packet: '→ ALB SG: 443 ✓',
          text: 'The ALB’s security group allows 443 from anywhere. The ALB terminates TLS and picks a healthy target.',
        },
        {
          from: 'alb',
          to: 'ec2b',
          packet: 'forward :8080',
          text: 'The ALB forwards to an instance in AZ-b (it balances across both AZs). The instance’s security group only accepts traffic *from the ALB’s security group* — direct internet access is impossible.',
        },
        {
          from: 'ec2b',
          to: 'rds',
          packet: 'SELECT products',
          text: 'The app queries RDS. The DB security group only accepts 5432 from the app tier. The primary DB synchronously replicates to a standby in AZ-a.',
        },
        {
          from: 'rds',
          to: 'ec2b',
          packet: 'rows',
          text: 'Data returns; the app renders the response. If AZ-b died right now, the ALB would shift traffic to AZ-a and RDS would fail over to its standby — users notice ~a minute of turbulence, not an outage.',
        },
        {
          from: 'ec2b',
          to: 'alb',
          packet: '200 OK',
          text: 'The response heads back through the ALB…',
        },
        {
          from: 'alb',
          to: 'user',
          packet: 'HTML/JSON 🔒',
          text: '…and out to the user, encrypted. Every tier scaled, monitored, and reachable only by the tier in front of it. This diagram answers half of all SAA scenarios.',
        },
      ],
    },
  },
]
