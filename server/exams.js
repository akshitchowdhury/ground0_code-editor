// Exam catalog shared by the AI generator and the offline question bank.
// Each exam type defines its domains so generation, grading breakdowns and
// feedback all speak the same language.

export const EXAM_TYPES = {
  ccp: {
    id: 'ccp',
    name: 'AWS Certified Cloud Practitioner',
    short: 'Cloud Practitioner',
    style:
      'foundational AWS knowledge questions in the style of the CLF-C02 exam: cloud value proposition, core services, security responsibility, and billing',
    domains: [
      'Cloud Concepts',
      'Security & Compliance',
      'Cloud Technology & Services',
      'Billing, Pricing & Support',
    ],
    advice: {
      'Cloud Concepts':
        'Revisit the six advantages of cloud computing and the differences between IaaS, PaaS and SaaS.',
      'Security & Compliance':
        'Study the AWS Shared Responsibility Model and IAM basics — users, groups, roles and policies.',
      'Cloud Technology & Services':
        'Build a mental map of core services: EC2, S3, RDS, Lambda, VPC, CloudFront and where each fits.',
      'Billing, Pricing & Support':
        'Compare On-Demand vs Reserved vs Spot pricing, and learn what each AWS Support plan includes.',
    },
  },
  saa: {
    id: 'saa',
    name: 'AWS Solutions Architect Associate',
    short: 'Solutions Architect',
    style:
      'scenario-based architecture questions in the style of the SAA-C03 exam: a short business/technical scenario followed by a question about the best AWS design choice',
    domains: [
      'Design Secure Architectures',
      'Design Resilient Architectures',
      'Design High-Performing Architectures',
      'Design Cost-Optimized Architectures',
    ],
    advice: {
      'Design Secure Architectures':
        'Focus on IAM policies, security groups vs NACLs, KMS encryption options and VPC isolation patterns.',
      'Design Resilient Architectures':
        'Review multi-AZ vs multi-region, Auto Scaling, ELB health checks, SQS decoupling and RDS failover.',
      'Design High-Performing Architectures':
        'Compare caching layers (CloudFront, ElastiCache), storage performance tiers and database read scaling.',
      'Design Cost-Optimized Architectures':
        'Learn S3 storage classes and lifecycle rules, EC2 purchasing options and serverless cost models.',
    },
  },
  devops: {
    id: 'devops',
    name: 'DevOps / Cloud Engineer Interview',
    short: 'DevOps Interview',
    style:
      'realistic interview scenario questions for a mid-level DevOps / cloud engineer role: each question describes a practical situation (broken pipeline, container issue, infra change, incident) and asks what the engineer should do',
    domains: [
      'CI/CD Pipelines',
      'Containers & Docker',
      'Infrastructure as Code',
      'Networking & Cloud',
      'Monitoring & Incidents',
    ],
    advice: {
      'CI/CD Pipelines':
        'Practice explaining pipeline stages (build, test, deploy), rollback strategies and blue/green vs canary releases.',
      'Containers & Docker':
        'Rebuild your Docker fundamentals: images vs containers, layers, Dockerfiles, registries and networking.',
      'Infrastructure as Code':
        'Get hands-on with Terraform: state, plan/apply workflow, modules and handling drift.',
      'Networking & Cloud':
        'Drill subnetting/CIDR, DNS resolution, load balancing and VPC design — common rapid-fire interview topics.',
      'Monitoring & Incidents':
        'Review the difference between metrics, logs and traces, alerting strategy and how to run a blameless postmortem.',
    },
  },
}

// ---------- Offline question bank (used when no ANTHROPIC_API_KEY) ----------
// q: question, s: optional scenario, o: 4 options, c: correct index, d: domain, e: explanation

export const QUESTION_BANK = {
  ccp: [
    {
      d: 'Cloud Concepts',
      q: 'Which of the following best describes the main financial benefit of moving to the AWS cloud?',
      o: [
        'Trading variable expense for fixed capital expense',
        'Trading capital expense for variable operating expense',
        'Eliminating all infrastructure costs entirely',
        'Locking in long-term hardware contracts at a discount',
      ],
      c: 1,
      e: 'The cloud replaces large upfront capital investments (buying servers) with pay-as-you-go variable costs that scale with actual usage.',
    },
    {
      d: 'Cloud Concepts',
      q: 'A company wants to run applications without managing servers, capacity or OS patching at all. Which cloud service model fits best?',
      o: ['Infrastructure as a Service (IaaS)', 'Platform/serverless offerings like AWS Lambda', 'On-premises virtualization', 'Colocation hosting'],
      c: 1,
      e: 'Serverless/PaaS offerings such as Lambda remove server management entirely — AWS handles provisioning, scaling and patching.',
    },
    {
      d: 'Security & Compliance',
      q: 'Under the AWS Shared Responsibility Model, which task is the CUSTOMER responsible for?',
      o: [
        'Physical security of data centers',
        'Patching the hypervisor',
        'Configuring security groups and IAM permissions',
        'Maintaining the global network infrastructure',
      ],
      c: 2,
      e: 'AWS secures the cloud itself (facilities, hardware, hypervisor); customers are responsible for security IN the cloud — their data, IAM, and network configuration.',
    },
    {
      d: 'Security & Compliance',
      q: 'What is the recommended way to grant an application running on an EC2 instance access to an S3 bucket?',
      o: [
        'Store an IAM user access key in the application code',
        'Attach an IAM role to the EC2 instance',
        'Make the S3 bucket public',
        'Share the root account credentials with the application',
      ],
      c: 1,
      e: 'IAM roles provide temporary, automatically-rotated credentials to EC2 instances — no hardcoded keys, no long-lived secrets.',
    },
    {
      d: 'Cloud Technology & Services',
      q: 'Which AWS service is an object storage service designed for 99.999999999% (11 nines) durability?',
      o: ['Amazon EBS', 'Amazon S3', 'Amazon RDS', 'AWS Storage Gateway'],
      c: 1,
      e: 'Amazon S3 is object storage with 11 nines of durability, achieved by redundantly storing objects across multiple devices and facilities.',
    },
    {
      d: 'Cloud Technology & Services',
      q: 'A team needs a managed relational database with automated backups and patching. Which service should they choose?',
      o: ['Amazon DynamoDB', 'Amazon RDS', 'Amazon Redshift', 'Amazon ElastiCache'],
      c: 1,
      e: 'Amazon RDS is the managed relational database service (MySQL, PostgreSQL, etc.) handling backups, patching and failover. DynamoDB is NoSQL; Redshift is a data warehouse.',
    },
    {
      d: 'Cloud Technology & Services',
      q: 'Which service lets you run code in response to events without provisioning servers?',
      o: ['Amazon EC2', 'AWS Lambda', 'Amazon Lightsail', 'AWS Elastic Beanstalk'],
      c: 1,
      e: 'AWS Lambda is event-driven, serverless compute — you upload code and pay only for execution time.',
    },
    {
      d: 'Billing, Pricing & Support',
      q: 'A workload runs 24/7 for the next 3 years with steady usage. Which EC2 pricing option is most cost-effective?',
      o: ['On-Demand Instances', 'Spot Instances', 'Reserved Instances / Savings Plans', 'Dedicated Hosts on demand'],
      c: 2,
      e: 'Reserved Instances or Savings Plans give up to ~72% discount over On-Demand for steady, predictable long-term workloads. Spot is for interruptible workloads.',
    },
    {
      d: 'Billing, Pricing & Support',
      q: 'Which tool lets you set custom cost thresholds and receive alerts when spending exceeds them?',
      o: ['AWS Cost Explorer', 'AWS Budgets', 'AWS Trusted Advisor', 'AWS Organizations'],
      c: 1,
      e: 'AWS Budgets lets you define cost or usage budgets and triggers alerts when actual or forecasted spend crosses thresholds. Cost Explorer is for analysis, not alerting.',
    },
    {
      d: 'Cloud Concepts',
      q: 'What does "elasticity" mean in cloud computing?',
      o: [
        'The ability to recover quickly from failures',
        'The ability to automatically acquire and release resources to match demand',
        'Storing data across multiple regions',
        'Running workloads on physical servers you own',
      ],
      c: 1,
      e: 'Elasticity is scaling resources out and in automatically as demand changes — pay for what you need, when you need it. (Recovering from failures is resiliency.)',
    },
    {
      d: 'Security & Compliance',
      q: 'Which service provides on-demand access to AWS compliance reports such as SOC and PCI?',
      o: ['AWS Artifact', 'AWS Shield', 'Amazon Inspector', 'AWS WAF'],
      c: 0,
      e: 'AWS Artifact is the self-service portal for downloading AWS compliance and audit documents.',
    },
    {
      d: 'Billing, Pricing & Support',
      q: 'Which AWS Support plan is the minimum tier that includes a Technical Account Manager (TAM)?',
      o: ['Developer', 'Business', 'Enterprise On-Ramp', 'Enterprise'],
      c: 3,
      e: 'A designated TAM is an Enterprise Support feature. Enterprise On-Ramp provides a pool of TAMs, but a designated TAM requires the full Enterprise plan.',
    },
  ],
  saa: [
    {
      d: 'Design Resilient Architectures',
      s: 'A web application runs on EC2 instances behind an Application Load Balancer in a single Availability Zone. Last month an AZ outage took the site down for four hours.',
      q: 'What should the architect do to improve availability with minimal redesign?',
      o: [
        'Move the application to a single larger instance',
        'Distribute instances across multiple AZs in an Auto Scaling group behind the ALB',
        'Replicate the whole stack into another AWS account',
        'Switch the ALB to a Network Load Balancer',
      ],
      c: 1,
      e: 'Multi-AZ deployment with Auto Scaling is the standard pattern for high availability — the ALB health-checks and routes around a failed AZ automatically.',
    },
    {
      d: 'Design Resilient Architectures',
      s: 'An order-processing service writes directly to a downstream inventory API. During traffic spikes the inventory API gets overwhelmed and orders are lost.',
      q: 'Which change makes the system more resilient to these spikes?',
      o: [
        'Increase the inventory API instance size',
        'Add retries with no backoff in the order service',
        'Decouple the services with an SQS queue between them',
        'Move both services to the same instance to reduce latency',
      ],
      c: 2,
      e: 'An SQS queue buffers bursts and decouples producers from consumers — the inventory service processes messages at its own pace and nothing is lost.',
    },
    {
      d: 'Design Secure Architectures',
      s: 'A company stores sensitive customer documents in S3. Compliance requires that all objects be encrypted at rest with keys the company can rotate and audit.',
      q: 'Which solution meets the requirement with the least operational overhead?',
      o: [
        'SSE-S3 (Amazon-managed keys)',
        'SSE-KMS with a customer-managed KMS key',
        'Client-side encryption with keys on-premises',
        'Store documents unencrypted but block public access',
      ],
      c: 1,
      e: 'SSE-KMS with a customer-managed key gives audit trails via CloudTrail and key rotation control, while AWS still handles the heavy lifting.',
    },
    {
      d: 'Design Secure Architectures',
      s: 'An application tier on EC2 must connect to an RDS database. Security requires that only the application tier can reach the database on port 5432.',
      q: 'What is the best way to enforce this?',
      o: [
        'Add a NACL rule allowing all VPC traffic to the DB subnet',
        "Reference the app tier's security group as the source in the DB security group inbound rule",
        'Use the same security group for every tier',
        'Allow 0.0.0.0/0 on port 5432 but enable SSL',
      ],
      c: 1,
      e: 'Security-group chaining (allowing inbound only from the app security group) restricts access to exactly the application tier, even as instances scale in and out.',
    },
    {
      d: 'Design High-Performing Architectures',
      s: 'A news site serves the same static images and articles to users worldwide. Users in Asia report slow load times; origin servers are in us-east-1.',
      q: 'Which solution improves global performance most directly?',
      o: [
        'Add larger EC2 instances in us-east-1',
        'Serve content through Amazon CloudFront with the S3/ALB origin',
        'Move the database to DynamoDB',
        'Enable S3 Transfer Acceleration for end users',
      ],
      c: 1,
      e: 'CloudFront caches static content at edge locations near users worldwide, cutting latency dramatically for a read-heavy global site.',
    },
    {
      d: 'Design High-Performing Architectures',
      s: 'A read-heavy MySQL RDS database is hitting CPU limits because of repeated identical product-catalog queries.',
      q: 'Which combination best relieves the read pressure?',
      o: [
        'Vertical scaling only — keep doubling the instance size',
        'Add read replicas and an ElastiCache caching layer',
        'Migrate to Redshift',
        'Enable Multi-AZ',
      ],
      c: 1,
      e: 'Read replicas spread read traffic and ElastiCache serves hot repeated queries from memory. Multi-AZ improves availability, not read performance.',
    },
    {
      d: 'Design Cost-Optimized Architectures',
      s: 'Application logs in S3 must be retained for 7 years for compliance. Logs older than 90 days are accessed at most once a year.',
      q: 'Which lifecycle strategy is most cost-effective?',
      o: [
        'Keep everything in S3 Standard',
        'Transition objects to S3 Glacier Deep Archive after 90 days',
        'Delete logs after 90 days',
        'Copy old logs to EBS snapshots',
      ],
      c: 1,
      e: 'Glacier Deep Archive is the cheapest storage class, ideal for rarely-accessed compliance archives; a lifecycle rule automates the transition.',
    },
    {
      d: 'Design Cost-Optimized Architectures',
      s: 'A nightly batch job processes images for 3 hours and can tolerate interruptions and restarts.',
      q: 'Which compute option minimizes cost?',
      o: ['On-Demand EC2 instances', 'Reserved Instances', 'Spot Instances', 'Dedicated Hosts'],
      c: 2,
      e: 'Spot Instances offer up to ~90% savings and are perfect for fault-tolerant, interruptible batch workloads.',
    },
    {
      d: 'Design Resilient Architectures',
      s: 'A company needs its RDS PostgreSQL database to fail over automatically within minutes if the primary instance or its AZ fails.',
      q: 'Which configuration provides this?',
      o: [
        'Manual snapshots restored on failure',
        'RDS Multi-AZ deployment with a standby replica',
        'A read replica in the same AZ',
        'Daily automated backups',
      ],
      c: 1,
      e: 'Multi-AZ keeps a synchronous standby in another AZ and fails over automatically. Read replicas are asynchronous and need manual promotion.',
    },
    {
      d: 'Design Secure Architectures',
      s: 'EC2 instances in private subnets must download OS updates from the internet, but must not be reachable from the internet.',
      q: 'Which component enables this?',
      o: [
        'An Internet Gateway with public IPs on the instances',
        'A NAT Gateway in a public subnet, with a route from the private subnets',
        'A VPC peering connection',
        'An ALB in front of the instances',
      ],
      c: 1,
      e: 'A NAT Gateway allows outbound-only internet access from private subnets — responses return, but no inbound connection can be initiated.',
    },
    {
      d: 'Design High-Performing Architectures',
      s: 'A gaming leaderboard needs single-digit-millisecond reads and writes at millions of requests per second, with a flexible schema.',
      q: 'Which database fits best?',
      o: ['Amazon RDS MySQL', 'Amazon DynamoDB', 'Amazon Redshift', 'Amazon Aurora PostgreSQL'],
      c: 1,
      e: 'DynamoDB is built for massive-scale key-value workloads with consistent single-digit-millisecond latency.',
    },
    {
      d: 'Design Cost-Optimized Architectures',
      s: 'A startup runs a low-traffic API that is idle most of the day with occasional short bursts.',
      q: 'Which architecture minimizes cost for this pattern?',
      o: [
        'Always-on EC2 instances behind an ALB',
        'API Gateway + AWS Lambda (pay per request)',
        'A dedicated RDS instance per endpoint',
        'An ECS cluster with reserved capacity',
      ],
      c: 1,
      e: 'With Lambda you pay only for actual invocations — an idle API costs nearly nothing, and bursts scale automatically.',
    },
  ],
  devops: [
    {
      d: 'CI/CD Pipelines',
      s: 'Your team merges to main several times a day. Production deploys are manual, happen weekly, and regularly break — rollbacks take an hour.',
      q: 'As the new DevOps engineer, what is the most impactful first improvement?',
      o: [
        'Switch to deploying monthly to reduce risk',
        'Automate the pipeline: build, test and deploy on each merge with an automated rollback strategy',
        'Add a mandatory 3-day code freeze before each release',
        'Give every developer production access to fix issues faster',
      ],
      c: 1,
      e: 'Smaller, automated, frequent deployments with tests and fast rollback shrink both failure rate and recovery time — the core of CI/CD.',
    },
    {
      d: 'CI/CD Pipelines',
      s: 'A deployment needs zero downtime, and the business wants to test the new version on 5% of real traffic before full rollout.',
      q: 'Which release strategy fits?',
      o: ['Recreate (stop old, start new)', 'Blue/green with instant cutover', 'Canary release', 'Big-bang deployment at midnight'],
      c: 2,
      e: 'A canary release routes a small slice of traffic to the new version, watches metrics, then gradually shifts the rest. Blue/green cuts over all traffic at once.',
    },
    {
      d: 'Containers & Docker',
      s: 'A Node.js app works on a developer laptop but crashes in production with "module not found". The Docker image is built from the project directory.',
      q: 'What is the most likely cause?',
      o: [
        'Docker does not support Node.js',
        'node_modules was copied from the laptop instead of installed in the image, or a dependency is missing from package.json',
        'The container needs more CPU',
        'The image must be rebuilt on the production server',
      ],
      c: 1,
      e: 'Classic "works on my machine": dependencies must be declared in package.json and installed during the image build (with node_modules in .dockerignore) so the image is reproducible.',
    },
    {
      d: 'Containers & Docker',
      s: 'Your Docker image is 2.4 GB and pushes to the registry take ten minutes.',
      q: 'Which approach reduces the image size most effectively?',
      o: [
        'Use a multi-stage build with a slim base image and copy only the build artifacts',
        'Run docker push with compression flags',
        'Combine the app and database into one container to save a pull',
        'Store images on a faster disk',
      ],
      c: 0,
      e: 'Multi-stage builds discard compilers and build tools — the final stage starts from a slim base (alpine/distroless) and contains only what runtime needs.',
    },
    {
      d: 'Infrastructure as Code',
      s: 'Someone changed a security group manually in the AWS console. Terraform plan now shows the resource will be modified back.',
      q: 'What is this situation called, and what is the right practice?',
      o: [
        'State locking — delete the state file to fix it',
        'Configuration drift — apply changes only through code so infra matches the declared state',
        'A Terraform bug — upgrade the provider',
        'Race condition — run apply twice',
      ],
      c: 1,
      e: 'Manual console edits cause drift between real infrastructure and code. The fix is process: all changes go through code review and terraform apply.',
    },
    {
      d: 'Infrastructure as Code',
      s: 'Two engineers run terraform apply at the same time against the same state and corrupt it.',
      q: 'What prevents this?',
      o: [
        'Asking in Slack before applying',
        'Remote state with state locking (e.g., S3 backend with locking)',
        'Keeping state files on each laptop',
        'Running apply only on Fridays',
      ],
      c: 1,
      e: 'A remote backend with state locking ensures only one apply mutates state at a time; the second run waits or fails cleanly.',
    },
    {
      d: 'Networking & Cloud',
      s: 'You are designing a VPC with CIDR 10.0.0.0/16 and need a subnet with roughly 250 usable addresses.',
      q: 'Which subnet size fits best?',
      o: ['/28', '/26', '/24', '/16'],
      c: 2,
      e: 'A /24 gives 256 addresses (251 usable on AWS after the 5 reserved). A /26 only gives 64; a /28 gives 16.',
    },
    {
      d: 'Networking & Cloud',
      s: 'Users report your site is unreachable, but the servers are healthy and serving traffic when hit by IP directly.',
      q: 'Which layer should you investigate first?',
      o: ['Disk I/O on the servers', 'DNS — records, TTLs and resolution', 'The CPU governor settings', 'Database indexes'],
      c: 1,
      e: 'Reachable by IP but not by name points at DNS: expired/changed records, bad delegation or stale caches. Tools: dig, nslookup.',
    },
    {
      d: 'Monitoring & Incidents',
      s: 'At 2 AM, error rates spike on the checkout service. You are on call.',
      q: 'What is the best first move?',
      o: [
        'Restart all services immediately',
        'Check dashboards/recent deploys to scope impact, and roll back the most recent change if it correlates',
        'Start refactoring the checkout code',
        'Wait 30 minutes to see if it self-heals',
      ],
      c: 1,
      e: 'Incident response starts with assessing scope and recent changes — a correlated rollback is usually the fastest mitigation. Fix forward later; postmortem after.',
    },
    {
      d: 'Monitoring & Incidents',
      q: 'What is the difference between metrics, logs and traces in observability?',
      o: [
        'They are interchangeable names for log files',
        'Metrics are numeric time series, logs are discrete event records, traces follow a request across services',
        'Metrics are only for billing, logs for auditors, traces for developers',
        'Traces are aggregated metrics with timestamps',
      ],
      c: 1,
      e: 'The three pillars: metrics (aggregated numbers over time), logs (detailed event records), traces (the path and timing of a single request through distributed services).',
    },
    {
      d: 'CI/CD Pipelines',
      s: 'Integration tests in the pipeline fail intermittently (~1 in 5 runs) with timeouts; devs have started clicking re-run until green.',
      q: 'What should you do about these flaky tests?',
      o: [
        'Delete the integration tests',
        'Quarantine and fix the flaky tests — flakiness erodes trust and hides real failures',
        'Increase the retry count to 10',
        'Run tests only on release day',
      ],
      c: 1,
      e: 'Re-running until green trains the team to ignore failures. Track flaky tests, quarantine them out of the blocking path, and fix root causes (timing, shared state).',
    },
    {
      d: 'Containers & Docker',
      q: 'Why should a container run a single main process rather than the app, database and cron jobs together?',
      o: [
        'Docker enforces a one-process limit',
        'Separate containers scale, update and fail independently, with isolated logs and resources',
        'Multiple processes need a paid Docker license',
        'It only matters on Windows hosts',
      ],
      c: 1,
      e: 'One concern per container is the core of the container model: independent scaling, smaller images, cleaner failure domains and simpler orchestration.',
    },
    {
      d: 'Infrastructure as Code',
      q: 'What does "terraform plan" do?',
      o: [
        'Immediately applies all pending changes',
        'Shows a preview diff of what would change without modifying anything',
        'Formats the configuration files',
        'Destroys unused resources',
      ],
      c: 1,
      e: 'plan compares desired state (code) with current state and prints the create/update/destroy diff — the review step before apply.',
    },
    {
      d: 'Networking & Cloud',
      q: 'What problem does a VPN solve when connecting an office network to a cloud VPC?',
      o: [
        'It increases raw bandwidth between the sites',
        'It creates an encrypted tunnel over the public internet so private networks can talk securely',
        'It replaces the need for IP addressing',
        'It caches cloud content locally',
      ],
      c: 1,
      e: 'A site-to-site VPN encrypts traffic between the office gateway and the cloud VPN gateway, extending the private network securely across the public internet.',
    },
  ],
}

export function sampleQuestions(examType, count) {
  const bank = QUESTION_BANK[examType] || []
  const shuffled = [...bank].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, bank.length)).map((item, i) => ({
    id: `q${i + 1}`,
    domain: item.d,
    scenario: item.s || '',
    question: item.q,
    options: item.o,
    correctIndex: item.c,
    explanation: item.e,
  }))
}
