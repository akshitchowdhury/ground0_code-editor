// Ground0 — Agentic Studio component catalog.
// Each entry is a draggable building block of an LLM-agent pipeline. `kind`
// drives the rules engine (src/lib/agent/analyze.js), the build profile
// (src/lib/agent/profile.js) and the flow simulator (src/lib/agent/simulate.js).
// Encodes mainstream agent-design practice (ReAct loops, RAG, tool calling,
// memory, guardrails, human-in-the-loop, eval & observability).

export const AGENT_CATALOG = [
  // ── Interface ───────────────────────────────────────────────────
  { id: 'user', name: 'User / App', short: 'User', icon: '👤', kind: 'app', category: 'Interface', config: {}, blurb: 'Your application or end-user — where a request enters the pipeline.' },
  { id: 'response', name: 'Response', short: 'Response', icon: '💬', kind: 'output', category: 'Interface', config: {}, blurb: 'The final answer or action returned to the user.' },

  // ── Reasoning ───────────────────────────────────────────────────
  { id: 'agent', name: 'Agent (orchestrator)', short: 'Agent', icon: '🤖', kind: 'agent', category: 'Reasoning', config: { pattern: 'react', maxSteps: 6, model: 'gpt-4o-mini' }, blurb: 'The brain: an LLM in a loop that reasons, calls tools and decides what to do next.' },
  { id: 'llm', name: 'LLM', short: 'LLM', icon: '🧠', kind: 'llm', category: 'Reasoning', config: { model: 'gpt-4o' }, blurb: 'A single model call — no loop. Good for one-shot generation or classification.' },
  { id: 'router', name: 'Supervisor / Router', short: 'Supervisor', icon: '🧭', kind: 'router', category: 'Reasoning', config: {}, blurb: 'Routes a request to the right specialist agent — the coordinator of a multi-agent system.' },

  // ── Knowledge (RAG) ─────────────────────────────────────────────
  { id: 'knowledge', name: 'Knowledge source', short: 'Knowledge', icon: '📚', kind: 'data', category: 'Knowledge (RAG)', config: { source: 'docs' }, blurb: 'Your documents / database / API — the private or fresh knowledge the model lacks.' },
  { id: 'embedder', name: 'Embedding model', short: 'Embedder', icon: '🧬', kind: 'embedder', category: 'Knowledge (RAG)', config: {}, blurb: 'Turns text into vectors so similar meaning lands nearby. Use the same one for docs & queries.' },
  { id: 'vectordb', name: 'Vector database', short: 'Vector DB', icon: '🗃️', kind: 'vectordb', category: 'Knowledge (RAG)', config: {}, blurb: 'Stores embeddings and finds the nearest ones fast (ANN). pgvector, Pinecone, Weaviate, FAISS.' },
  { id: 'retriever', name: 'Retriever', short: 'Retriever', icon: '🔎', kind: 'retriever', category: 'Knowledge (RAG)', config: { topK: 5 }, blurb: 'Embeds the query, fetches the top-k closest chunks, and hands them to the agent as context.' },

  // ── Tools & actions ─────────────────────────────────────────────
  { id: 'tool_search', name: 'Web search tool', short: 'Web search', icon: '🌐', kind: 'tool', category: 'Tools & Actions', config: { toolType: 'search', sideEffecting: false, auth: false }, blurb: 'Reads live information from the web. Untrusted content — a prompt-injection surface.' },
  { id: 'tool_api', name: 'API call tool', short: 'API tool', icon: '🔌', kind: 'tool', category: 'Tools & Actions', config: { toolType: 'api', sideEffecting: false, auth: true }, blurb: 'Calls an external/internal API to fetch data.' },
  { id: 'tool_db', name: 'Database tool', short: 'DB tool', icon: '🗄️', kind: 'tool', category: 'Tools & Actions', config: { toolType: 'db', sideEffecting: false, auth: true, write: false }, blurb: 'Queries a database. Flip "write" on and it can change data — handle with care.' },
  { id: 'tool_code', name: 'Code execution', short: 'Code exec', icon: '🖥️', kind: 'tool', category: 'Tools & Actions', config: { toolType: 'code', sideEffecting: true, sandboxed: false, auth: false }, blurb: 'Runs model-written code. Powerful and dangerous — must be sandboxed.' },
  { id: 'tool_action', name: 'Action (email / payment)', short: 'Action', icon: '✉️', kind: 'tool', category: 'Tools & Actions', config: { toolType: 'action', sideEffecting: true, auth: true }, blurb: 'Takes a real-world, often irreversible action. Should require human approval.' },

  // ── Memory ──────────────────────────────────────────────────────
  { id: 'memory_short', name: 'Short-term memory', short: 'Short memory', icon: '📝', kind: 'memory', category: 'Memory', config: { memType: 'short' }, blurb: 'Holds the recent conversation so a chat keeps context across turns.' },
  { id: 'memory_long', name: 'Long-term memory', short: 'Long memory', icon: '🗂️', kind: 'memory', category: 'Memory', config: { memType: 'long' }, blurb: 'Persists facts/preferences across sessions, usually in a vector store.' },

  // ── Customize & train ───────────────────────────────────────────
  { id: 'prompt', name: 'System prompt', short: 'Prompt', icon: '⚙️', kind: 'prompt', category: 'Customize & Train', config: { fewShot: false }, blurb: 'Sets the role, rules and output format. The cheapest, fastest way to steer behavior.' },
  { id: 'finetune', name: 'Fine-tune dataset', short: 'Fine-tune', icon: '🎛️', kind: 'training', category: 'Customize & Train', config: { method: 'fine-tune', examples: 50, labeled: true }, blurb: 'Adjusts the model’s weights to bake in a style, format or narrow skill. Teaches behavior, not facts.' },
  { id: 'rlhf', name: 'Preference data (RLHF)', short: 'RLHF', icon: '👍', kind: 'training', category: 'Customize & Train', config: { method: 'rlhf', examples: 1000 }, blurb: 'Aligns tone/safety from human preference comparisons. Comes after fine-tuning, not before.' },

  // ── Safety & ops ────────────────────────────────────────────────
  { id: 'guardrail', name: 'Guardrails', short: 'Guardrails', icon: '🛡️', kind: 'guardrail', category: 'Safety & Ops', config: {}, blurb: 'Filters inputs/outputs: PII, jailbreaks, toxicity, schema validation. Your safety net.' },
  { id: 'human', name: 'Human-in-the-loop', short: 'Human review', icon: '🙋', kind: 'human', category: 'Safety & Ops', config: {}, blurb: 'A person approves risky/irreversible actions before they run.' },
  { id: 'eval', name: 'Eval / test set', short: 'Eval', icon: '✅', kind: 'eval', category: 'Safety & Ops', config: { examples: 50 }, blurb: 'A fixed test set + metrics so you can measure quality and catch regressions.' },
  { id: 'observability', name: 'Observability', short: 'Tracing', icon: '📊', kind: 'observability', category: 'Safety & Ops', config: {}, blurb: 'Traces every run (steps, tokens, cost, latency) so you can debug and monitor. e.g. LangSmith.' },
]

export const AGENT_BY_ID = Object.fromEntries(AGENT_CATALOG.map((c) => [c.id, c]))
export const getAgentComponent = (id) => AGENT_BY_ID[id]

export const AGENT_CATEGORIES = AGENT_CATALOG.reduce((acc, c) => {
  ;(acc[c.category] ||= []).push(c)
  return acc
}, {})

// Models offered for the Agent/LLM nodes — capability (1–5) + rough cost.
export const MODELS = {
  'gpt-4o': { label: 'GPT-4o', tier: 'frontier', reasoning: 5, costPer1k: 0.0075 },
  'claude-sonnet': { label: 'Claude Sonnet', tier: 'frontier', reasoning: 5, costPer1k: 0.009 },
  'llama-70b': { label: 'Llama 3.1 70B (OSS)', tier: 'mid', reasoning: 4, costPer1k: 0.0009 },
  'gpt-4o-mini': { label: 'GPT-4o mini', tier: 'small', reasoning: 3, costPer1k: 0.0004 },
  'llama-8b': { label: 'Llama 3.1 8B (OSS)', tier: 'small', reasoning: 2, costPer1k: 0.0002 },
}
export const MODEL_OPTIONS = Object.keys(MODELS)

export const AGENT_PATTERNS = {
  react: 'ReAct — reason + act loop',
  'plan-execute': 'Plan-and-Execute',
  reflection: 'Reflection — self-critique',
  router: 'Router — single shot',
}
export const PATTERN_OPTIONS = Object.keys(AGENT_PATTERNS)
export const DATA_SOURCE_OPTIONS = ['docs', 'database', 'api', 'web']

// Agent archetypes the user picks to start from. `requires` lists the kinds a
// healthy build of this type should include — the rules engine checks them.
export const AGENT_BLUEPRINTS = [
  { id: 'start-simple', name: 'Your first agent', icon: '✨', level: 'beginner', desc: 'The simplest possible pipeline — start here.', explain: 'Your message plus a system prompt go to one model, which replies. Four blocks: User → Agent → Response, with a Prompt steering the agent. Build this first, then add safety, knowledge and tools step by step.', requires: [], template: 'first-agent' },
  { id: 'chatbot', name: 'Conversational Chatbot', icon: '💬', level: 'beginner', desc: 'A multi-turn assistant that remembers the conversation.', explain: 'Like the simple agent, but with short-term memory: each turn the conversation history is fed back in so it remembers context, and guardrails screen the input first.', requires: ['memory', 'guardrail'], template: 'chatbot' },
  { id: 'rag-qa', name: 'RAG Q&A Assistant', icon: '📚', level: 'beginner', desc: 'Answers questions grounded in your own documents.', explain: 'Gives the agent YOUR knowledge. Documents are split, embedded into vectors and stored in a vector DB (offline). At query time a retriever fetches the most relevant chunks and the agent answers grounded in them — this is RAG.', requires: ['retriever', 'vectordb', 'guardrail'], template: 'rag-qa' },
  { id: 'react-tool', name: 'Tool-using Agent', icon: '🛠️', level: 'standard', desc: 'Reasons and calls tools / APIs to get things done (ReAct).', explain: 'The agent reasons, calls a tool, reads the result, then reasons again — the ReAct loop. A step limit stops runaway loops, and irreversible actions are gated behind a human approval.', requires: ['tool', 'guardrail'], needsStop: true, template: 'react-tool' },
  { id: 'workflow', name: 'Automation Workflow', icon: '⚙️', level: 'standard', desc: 'Multi-step task automation that can take real actions.', explain: 'A planner agent breaks a task into steps and runs tools (APIs, DB) to complete it. A human approves any real-world action before it executes, and an eval set guards quality.', requires: ['tool', 'human', 'eval'], needsStop: true, template: 'workflow' },
  { id: 'multi-agent', name: 'Multi-agent System', icon: '🧭', level: 'standard', desc: 'A supervisor delegating to specialist agents.', explain: 'A supervisor / router reads each request and dispatches it to the right specialist agent (e.g. a researcher and a writer), then collects the result.', requires: ['router'], template: 'multi-agent' },
  { id: 'classifier', name: 'Classifier / Extractor', icon: '🏷️', level: 'standard', desc: 'Structured output at scale — often fine-tuned, always evaluated.', explain: 'A single model call turns input into structured output (labels, JSON) at scale. Often fine-tuned on labeled examples for accuracy and cost, and always measured against an eval set.', requires: ['eval'], template: 'classifier' },
]
export const getBlueprint = (id) => AGENT_BLUEPRINTS.find((b) => b.id === id)

// Kind groups used across the engines.
export const TOOL_KINDS = ['tool']
export const KNOWLEDGE_KINDS = ['data', 'embedder', 'vectordb', 'retriever']
