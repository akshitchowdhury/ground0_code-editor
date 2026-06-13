// Ground0: Cloud — learning module metadata. Lesson content lives in
// ./lessons/*; exam metadata lives on the backend (server/exams.js).

export const CLOUD_MODULES = [
  {
    id: 'networking',
    name: 'Networking Fundamentals',
    tagline: 'How data really moves — packets, OSI model, DNS, CIDR & subnets, VPNs and TLS.',
    accent: 'cyan',
    badge: '🌐',
  },
  {
    id: 'apis',
    name: 'APIs & Microservices',
    tagline: 'REST APIs, API gateways, caching with Redis, and how systems are split into services that talk.',
    accent: 'violet',
    badge: '⇄',
  },
  {
    id: 'databases',
    name: 'Databases & Data Modeling',
    tagline: 'SQL vs NoSQL, indexing, replication and sharding — and why picking the right database makes or breaks a design.',
    accent: 'sky',
    badge: '🗄️',
  },
  {
    id: 'cloud',
    name: 'Cloud Computing & AWS',
    tagline: 'Cloud models, the AWS core services, and how a real request flows through a VPC.',
    accent: 'orange',
    badge: '☁',
  },
  {
    id: 'devops',
    name: 'DevOps, CI/CD & IaC',
    tagline: 'Pipelines, Docker containers, Terraform and the observability that keeps it running.',
    accent: 'emerald',
    badge: '∞',
  },
  {
    id: 'ai',
    name: 'AI, ML & LLMs',
    tagline: 'How machines learn, how LLMs generate text token by token, vector databases & RAG, and agentic workflows — all visualized.',
    accent: 'fuchsia',
    badge: '🧠',
  },
]

export function getCloudModule(id) {
  return CLOUD_MODULES.find((m) => m.id === id)
}

export const EXAM_CATALOG = [
  {
    id: 'ccp',
    name: 'AWS Cloud Practitioner',
    desc: 'Foundational AWS — cloud concepts, security, services, billing. Great first certification.',
    badge: 'CCP',
    accent: 'orange',
  },
  {
    id: 'saa',
    name: 'AWS Solutions Architect',
    desc: 'Scenario-based architecture questions in the style of the SAA-C03 associate exam.',
    badge: 'SAA',
    accent: 'cyan',
  },
  {
    id: 'devops',
    name: 'DevOps / Cloud Interview',
    desc: 'Realistic interview scenarios: broken pipelines, container issues, infra changes, incidents.',
    badge: '∞',
    accent: 'emerald',
  },
]
