// DevOps, CI/CD & IaC — lessons with interactive flow boards.

export default [
  {
    id: 'cicd',
    title: 'DevOps & CI/CD Pipelines',
    summary: 'From commit to production: automate the path, shrink the risk.',
    blocks: [
      {
        type: 'p',
        text: '**DevOps** is a culture: the people who build software also ship and run it, with automation replacing handoffs. Its engine is the **CI/CD pipeline**.',
      },
      {
        type: 'list',
        items: [
          '**CI — Continuous Integration**: every merge triggers an automated build + test run. Broken code is caught in minutes, not at release time.',
          '**CD — Continuous Delivery/Deployment**: every green build is packaged and deployed automatically (to staging, then production).',
          'Tools: GitHub Actions, GitLab CI, Jenkins, AWS CodePipeline.',
        ],
      },
      { type: 'h3', text: 'Release strategies' },
      {
        type: 'list',
        items: [
          '**Rolling** — replace instances a few at a time.',
          '**Blue/green** — run old + new side by side, switch traffic instantly, switch back to roll back.',
          '**Canary** — send ~5% of traffic to the new version, watch metrics, then ramp up.',
        ],
      },
      {
        type: 'p',
        text: 'Why it matters: small, frequent, automated deployments have **lower** failure rates than big quarterly releases — and recover in minutes. Play the pipeline.',
      },
    ],
    flow: {
      title: 'Commit → production pipeline',
      w: 760,
      h: 420,
      nodes: [
        { id: 'dev', x: 16, y: 60, icon: '👩‍💻', label: 'Developer', sub: 'git push', w: 104 },
        { id: 'repo', x: 180, y: 60, icon: '🌿', label: 'Git repo', sub: 'main branch' },
        { id: 'ci', x: 360, y: 60, icon: '🤖', label: 'CI server', sub: 'build + test' },
        { id: 'reg', x: 560, y: 60, icon: '🏷️', label: 'Registry', sub: 'image v1.4.2' },
        { id: 'stage', x: 560, y: 220, icon: '🎭', label: 'Staging', sub: 'smoke tests' },
        { id: 'prod', x: 360, y: 300, icon: '🚀', label: 'Production', sub: 'canary 5% → 100%' },
        { id: 'mon', x: 120, y: 300, icon: '📈', label: 'Monitoring', sub: 'alerts on regressions' },
      ],
      edges: [
        { from: 'dev', to: 'repo', label: 'push' },
        { from: 'repo', to: 'ci', label: 'webhook' },
        { from: 'ci', to: 'reg', label: 'push image' },
        { from: 'reg', to: 'stage', label: 'deploy' },
        { from: 'stage', to: 'prod', label: 'promote' },
        { from: 'prod', to: 'mon', label: 'metrics' },
        { from: 'mon', to: 'prod', dashed: true, label: 'auto-rollback' },
      ],
      steps: [
        {
          from: 'dev',
          to: 'repo',
          packet: 'git push (PR merged)',
          text: 'A reviewed pull request merges to main. That merge is the only human action in the whole release.',
        },
        {
          from: 'repo',
          to: 'ci',
          packet: 'webhook: new commit',
          text: 'The repo notifies CI. A clean runner checks out the exact commit — builds are reproducible, never "works on my machine".',
        },
        {
          from: 'ci',
          to: 'ci',
          packet: 'lint + unit + integration',
          text: 'CI compiles the code and runs the test pyramid. Any failure stops the pipeline and pings the author — broken code never travels further.',
        },
        {
          from: 'ci',
          to: 'reg',
          packet: 'docker push v1.4.2',
          text: 'Green build → CI bakes an immutable, versioned artifact (a container image) and pushes it to the registry. The same bytes will run everywhere.',
        },
        {
          from: 'reg',
          to: 'stage',
          packet: 'deploy v1.4.2',
          text: 'CD deploys the image to staging — a production look-alike — and runs smoke tests against real endpoints.',
        },
        {
          from: 'stage',
          to: 'prod',
          packet: 'canary 5%',
          text: 'Promotion to production starts as a canary: 5% of real traffic hits v1.4.2 while dashboards compare error rates and latency against the old version.',
        },
        {
          from: 'prod',
          to: 'mon',
          packet: 'error rate ok ✓',
          text: 'Metrics stay healthy, the rollout ramps to 100%. Had errors spiked, the pipeline would auto-rollback to the previous image in seconds — that is the safety net that makes daily deploys boring.',
        },
      ],
    },
  },

  {
    id: 'docker',
    title: 'Docker & Containers',
    summary: 'Build once, run anywhere: images, layers, registries.',
    blocks: [
      {
        type: 'p',
        text: 'A **container** packages your app with everything it needs — runtime, libraries, OS packages — into one isolated, portable unit. Unlike a VM, it shares the host kernel, so it starts in milliseconds and weighs megabytes.',
      },
      {
        type: 'list',
        items: [
          '**Image** — the immutable blueprint, built in **layers** (each Dockerfile line = a cached layer).',
          '**Container** — a running instance of an image.',
          '**Registry** — where images live: Docker Hub, Amazon ECR.',
          '**Orchestrator** — runs containers at scale: Kubernetes, ECS.',
        ],
      },
      {
        type: 'code',
        text: '# Dockerfile — multi-stage keeps the final image small\nFROM node:22 AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:22-slim\nCOPY --from=build /app/dist ./dist\nCMD ["node", "dist/server.js"]',
      },
      {
        type: 'p',
        text: 'The fix for "works on my machine" is that the machine ships with the app. Follow the build-ship-run cycle on the board.',
      },
    ],
    flow: {
      title: 'Build → ship → run',
      w: 760,
      h: 380,
      nodes: [
        { id: 'code', x: 20, y: 60, icon: '📄', label: 'Dockerfile + code' },
        { id: 'build', x: 230, y: 60, icon: '🔨', label: 'docker build', sub: 'layered image' },
        { id: 'reg', x: 470, y: 60, icon: '🏪', label: 'Registry', sub: 'ECR / Docker Hub' },
        { id: 'srv1', x: 360, y: 270, icon: '🖥️', label: 'Server A', sub: 'docker run' },
        { id: 'srv2', x: 590, y: 270, icon: '🖥️', label: 'Server B', sub: 'docker run' },
        { id: 'laptop', x: 90, y: 270, icon: '💻', label: 'Any laptop', sub: 'same image' },
      ],
      edges: [
        { from: 'code', to: 'build' },
        { from: 'build', to: 'reg', label: 'push' },
        { from: 'reg', to: 'srv1', label: 'pull' },
        { from: 'reg', to: 'srv2', label: 'pull' },
        { from: 'reg', to: 'laptop', label: 'pull' },
      ],
      steps: [
        {
          from: 'code',
          to: 'build',
          packet: 'docker build -t app:1.0',
          text: 'Docker executes the Dockerfile line by line, producing a layer per instruction. Unchanged layers come from cache — rebuilds after a code change take seconds.',
        },
        {
          from: 'build',
          to: 'build',
          packet: 'layers: base→deps→app',
          text: 'The image stacks: slim base OS → npm dependencies → your built app. A multi-stage build drops compilers and dev tools, shrinking 1.2 GB to ~150 MB.',
        },
        {
          from: 'build',
          to: 'reg',
          packet: 'push app:1.0',
          text: 'The tagged image is pushed to the registry. Only new layers upload — the base layers are already there.',
        },
        {
          from: 'reg',
          to: 'srv1',
          packet: 'pull app:1.0',
          text: 'Server A pulls and runs the image. The container gets an isolated filesystem, network and process space — it cannot see other containers.',
        },
        {
          from: 'reg',
          to: 'srv2',
          packet: 'pull app:1.0',
          text: 'Server B runs the *identical bytes*. Scaling out is pulling the same image more times — there is no "setup the server" step anymore.',
        },
        {
          from: 'reg',
          to: 'laptop',
          packet: 'pull app:1.0',
          text: 'A teammate runs the same image locally to debug a production issue. Build once, run anywhere — that is the whole pitch.',
        },
      ],
    },
  },

  {
    id: 'terraform',
    title: 'Terraform & Infrastructure as Code',
    summary: 'Your data center, declared in text files and code-reviewed.',
    blocks: [
      {
        type: 'p',
        text: '**Infrastructure as Code** means defining servers, networks and databases in version-controlled text files instead of clicking consoles. **Terraform** is the most common tool: you *declare* the desired end state and it figures out the API calls.',
      },
      {
        type: 'code',
        text: 'resource "aws_instance" "web" {\n  ami           = "ami-0abc123"\n  instance_type = "t3.micro"\n  tags = { Name = "web-1" }\n}',
      },
      {
        type: 'list',
        items: [
          '**State file** — Terraform’s record of what it created; kept in a remote backend (S3) with **locking**.',
          '`terraform plan` — preview the diff. `terraform apply` — make it real.',
          '**Drift** — manual console edits that diverge from code; plan exposes them.',
          'Same idea, different tools: CloudFormation/CDK (AWS), Pulumi.',
        ],
      },
      { type: 'h3', text: 'Why teams insist on it' },
      {
        type: 'p',
        text: 'Infra changes become pull requests: reviewed, repeatable, rollback-able. A whole environment can be recreated from scratch in minutes — for disaster recovery or just a staging copy.',
      },
    ],
    flow: {
      title: 'terraform plan → apply',
      w: 760,
      h: 400,
      nodes: [
        { id: 'code', x: 20, y: 160, icon: '📜', label: '.tf files', sub: 'desired state' },
        { id: 'tf', x: 230, y: 160, icon: '🧮', label: 'Terraform', sub: 'plan / apply' },
        { id: 'state', x: 230, y: 20, icon: '🗃️', label: 'State (S3)', sub: 'current state + lock' },
        { id: 'review', x: 230, y: 310, icon: '👀', label: 'PR review', sub: 'human gate' },
        { id: 'aws', x: 500, y: 160, icon: '☁️', label: 'AWS API', sub: 'creates resources' },
        { id: 'infra', x: 640, y: 300, icon: '🏗️', label: 'Real infra', sub: 'EC2, VPC, RDS…', w: 104 },
      ],
      edges: [
        { from: 'code', to: 'tf' },
        { from: 'tf', to: 'state', label: 'read + lock' },
        { from: 'tf', to: 'review', label: 'plan diff' },
        { from: 'tf', to: 'aws', label: 'apply' },
        { from: 'aws', to: 'infra' },
      ],
      steps: [
        {
          from: 'code',
          to: 'tf',
          packet: '+ aws_instance.web',
          text: 'An engineer adds a resource block and opens a PR. The config declares *what should exist* — never the steps to get there.',
        },
        {
          from: 'tf',
          to: 'state',
          packet: 'lock + read state',
          text: 'terraform plan locks the remote state (so two applies can’t collide) and reads what currently exists according to the last run.',
        },
        {
          from: 'tf',
          to: 'review',
          packet: 'Plan: 1 add, 0 destroy',
          text: 'Terraform diffs desired vs actual and prints the plan: "1 to add". Reviewers approve infrastructure exactly like application code.',
        },
        {
          from: 'tf',
          to: 'aws',
          packet: 'RunInstances(t3.micro)',
          text: 'terraform apply executes the plan by calling the cloud APIs in dependency order — VPC before subnet before instance.',
        },
        {
          from: 'aws',
          to: 'infra',
          packet: 'i-0f3a… running',
          text: 'The instance boots. Terraform records its ID and attributes in the state file and releases the lock.',
        },
        {
          from: 'state',
          to: 'tf',
          packet: 'next plan: no changes',
          text: 'Running plan again now reports "no changes" — code, state and reality agree. If someone hand-edits the console, the next plan exposes the drift immediately.',
        },
      ],
    },
  },

  {
    id: 'observability',
    title: 'Monitoring, Observability & Incidents',
    summary: 'Metrics, logs, traces — and what actually happens at 2 AM.',
    blocks: [
      {
        type: 'p',
        text: 'You can’t run what you can’t see. **Observability** rests on three pillars:',
      },
      {
        type: 'list',
        items: [
          '**Metrics** — numeric time series (CPU, request rate, error %). Cheap, great for alerting. *CloudWatch, Prometheus.*',
          '**Logs** — detailed event records with context. *CloudWatch Logs, ELK.*',
          '**Traces** — one request’s journey across services, with timing per hop. *X-Ray, Jaeger.*',
        ],
      },
      { type: 'h3', text: 'Alerting that doesn’t burn people out' },
      {
        type: 'p',
        text: 'Alert on **symptoms users feel** (error rate, latency) not on every cause (CPU). Every page must be actionable — noisy alerts train on-call to ignore the real one.',
      },
      { type: 'h3', text: 'Incident response' },
      {
        type: 'list',
        items: [
          '**Mitigate first** (roll back, shift traffic), root-cause later.',
          'Communicate status early and often.',
          'Afterwards: a **blameless postmortem** — fix the system, not the person.',
        ],
      },
    ],
    flow: {
      title: 'Anatomy of a 2 AM incident',
      w: 760,
      h: 400,
      nodes: [
        { id: 'app', x: 20, y: 160, icon: '🚀', label: 'Production', sub: 'v2.1 just deployed' },
        { id: 'cw', x: 230, y: 60, icon: '📈', label: 'Metrics', sub: 'error rate 0.1%→8%' },
        { id: 'alert', x: 440, y: 60, icon: '🚨', label: 'Alert manager', sub: 'threshold breach' },
        { id: 'oncall', x: 620, y: 160, icon: '😴', label: 'On-call', sub: 'paged 02:04', w: 110 },
        { id: 'logs', x: 440, y: 280, icon: '📜', label: 'Logs & traces', sub: 'find the cause' },
        { id: 'rollback', x: 200, y: 280, icon: '⏪', label: 'Rollback', sub: 'deploy v2.0' },
      ],
      edges: [
        { from: 'app', to: 'cw', label: 'emit metrics' },
        { from: 'cw', to: 'alert' },
        { from: 'alert', to: 'oncall', label: 'page' },
        { from: 'oncall', to: 'logs', label: 'investigate' },
        { from: 'logs', to: 'rollback', label: 'decision' },
        { from: 'rollback', to: 'app', label: 'mitigate' },
      ],
      steps: [
        {
          from: 'app',
          to: 'cw',
          packet: '5xx rate: 8%',
          text: '02:01 — v2.1 shipped an hour ago. Checkout errors climb from 0.1% to 8%. The app continuously emits metrics; nobody is watching — the system is.',
        },
        {
          from: 'cw',
          to: 'alert',
          packet: 'threshold: >2% for 5m',
          text: '02:03 — the alert rule fires: error rate above 2% for 5 minutes. Symptom-based, so it catches this regardless of cause.',
        },
        {
          from: 'alert',
          to: 'oncall',
          packet: '📟 PAGE: checkout 5xx',
          text: '02:04 — the on-call engineer is paged with a link to the dashboard. First question: *what changed recently?*',
        },
        {
          from: 'oncall',
          to: 'logs',
          packet: 'grep + trace',
          text: '02:08 — logs show NullPointerException in the new discount code path; the trace pins it to v2.1. Correlation: deploy time matches the error spike exactly.',
        },
        {
          from: 'logs',
          to: 'rollback',
          packet: 'decision: roll back',
          text: '02:11 — mitigate first, debug later. The engineer triggers the pipeline’s rollback to the previous known-good image.',
        },
        {
          from: 'rollback',
          to: 'app',
          packet: 'deploy v2.0 ✓',
          text: '02:14 — error rate back to 0.1%. Total user impact: 13 minutes. Tomorrow: a blameless postmortem and a new test that would have caught the bug in CI.',
        },
      ],
    },
  },
]
