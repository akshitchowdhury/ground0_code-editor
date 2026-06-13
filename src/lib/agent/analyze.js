// Rules engine for the Agentic Studio. Pure:
//   analyzeAgent({ nodes, edges, blueprintId }) -> {
//     findings: [{ id, level, category, title, detail, nodeIds }],
//     safetyScore, designScore, overall, verdict
//   }
// Encodes mainstream agent-design practice: bound your loops, gate irreversible
// actions behind a human, guard untrusted input, use RAG for knowledge (not
// fine-tuning), and always evaluate + observe.
import { MODELS, getBlueprint } from '../../data/cloud/agentComponents.js'
import { FINDING_STYLES } from '../cloud/analyze.js'

export { FINDING_STYLES }

const LEVEL_WEIGHT = { critical: 30, high: 17, warn: 9, info: 4 }
const SAFETY_CATS = ['safety']

export const CATEGORY_LABELS = {
  correctness: 'Correctness',
  safety: 'Safety',
  reliability: 'Reliability',
  data: 'Training data',
  cost: 'Cost',
}

export function analyzeAgent({ nodes = [], edges = [], blueprintId = null }) {
  const findings = []
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const add = (level, category, title, detail, nodeIds = []) =>
    findings.push({ id: `${category}-${findings.length}`, level, category, title, detail, nodeIds })

  // adjacency (undirected, for "connected to" checks)
  const adj = {}
  nodes.forEach((n) => (adj[n.id] = []))
  edges.forEach((e) => {
    if (adj[e.from] && adj[e.to]) {
      adj[e.from].push(e.to)
      adj[e.to].push(e.from)
    }
  })
  const neighborsOf = (id) => (adj[id] || []).map((x) => byId[x]).filter(Boolean)

  const of = (kind) => nodes.filter((n) => n.kind === kind)
  const has = (kind) => nodes.some((n) => n.kind === kind)
  const agents = of('agent')
  const brains = nodes.filter((n) => n.kind === 'agent' || n.kind === 'llm')
  const tools = of('tool')
  const trainings = of('training')
  const hasGuardrail = has('guardrail')
  const hasHuman = has('human')
  const blueprint = getBlueprint(blueprintId)

  // 1. No reasoning at all.
  if (nodes.length > 0 && brains.length === 0) {
    add('critical', 'correctness', 'No agent or LLM in the pipeline', 'Every agentic system needs a reasoning model. Drop an Agent (looping) or LLM (single-shot) onto the canvas.')
  }

  // 2. Unbounded agent loop.
  for (const a of agents) {
    const max = a.config?.maxSteps
    if (!max || max <= 0) {
      add('high', 'reliability', `${a.label || a.name} has no step limit`, `An agent loop with no maximum number of steps can run forever and burn unbounded tokens/cost. Set a max-step (recursion) limit — typically 4–10.`, [a.id])
    }
  }

  // 3. Side-effecting tools with no human-in-the-loop.
  for (const t of tools) {
    const risky = t.config?.sideEffecting || t.config?.write
    if (!risky) continue
    const guardedByHuman = neighborsOf(t.id).some((nb) => nb.kind === 'human')
    if (!guardedByHuman) {
      add('high', 'safety', `${t.label || t.name} can act with no human approval`, `${t.label || t.name} performs an irreversible / side-effecting action. Route it through a Human-in-the-loop node (or a strict guardrail) so a person approves before it runs.`, [t.id])
    }
  }

  // 4. No guardrails on a user-facing system.
  if (brains.length && !hasGuardrail) {
    add('warn', 'safety', 'No guardrails', 'Add input/output guardrails — prompt-injection and jailbreak filtering, PII redaction, toxicity and output-schema validation. They are your safety net against untrusted input.', brains.map((b) => b.id))
  }

  // 5. Unsandboxed code execution.
  for (const t of tools) {
    if (t.config?.toolType === 'code' && !t.config?.sandboxed) {
      add('high', 'safety', `${t.label || t.name} runs code unsandboxed`, 'Model-written code must run in an isolated sandbox with no access to the host filesystem, secrets or network. Enable sandboxing.', [t.id])
    }
  }

  // 6. RAG pipeline incomplete.
  const hasRetriever = has('retriever')
  const hasVectordb = has('vectordb')
  const hasEmbedder = has('embedder')
  const hasData = has('data')
  if (hasRetriever && !hasVectordb) {
    add('warn', 'correctness', 'Retriever has no vector database', 'A retriever needs a vector database to search. Wire: Knowledge → Embedding model → Vector DB → Retriever → Agent.', of('retriever').map((r) => r.id))
  }
  if (hasData && !trainings.length && !(hasEmbedder && hasVectordb && hasRetriever)) {
    add('warn', 'correctness', 'Knowledge source is not usable yet', 'Your knowledge source isn’t wired into a retrieval pipeline. To make the agent use it, add the missing pieces: Embedding model → Vector DB → Retriever.', of('data').map((d) => d.id))
  }

  // 7. Fine-tuning used to add knowledge.
  const fineTunes = trainings.filter((t) => t.config?.method === 'fine-tune')
  if (fineTunes.length && hasData && !hasRetriever) {
    add('warn', 'data', 'Fine-tuning won’t add knowledge', 'Fine-tuning teaches style, format and skills — not facts. To give the agent your documents’ knowledge, use RAG (Embedder → Vector DB → Retriever), not fine-tuning.', fineTunes.map((t) => t.id))
  }

  // 8. Fine-tune dataset too small / unlabeled.
  for (const t of fineTunes) {
    const n = t.config?.examples ?? 0
    if (n < 100) add('warn', 'data', `${t.label || t.name}: too few examples`, `Fine-tuning on ~${n} examples rarely helps. Aim for hundreds to thousands of high-quality, labeled examples — or stick with prompting + RAG.`, [t.id])
    if (t.config?.labeled === false) add('warn', 'data', `${t.label || t.name}: data is unlabeled`, 'Supervised fine-tuning needs labeled input→output pairs. Unlabeled data can’t be used directly — label it or choose a different approach.', [t.id])
  }

  // 9. No evaluation.
  if (brains.length && !has('eval')) {
    add('warn', 'reliability', 'No eval / test set', 'Without a fixed evaluation set you can’t measure quality, compare prompts/models, or catch regressions. Add an Eval node — evaluation is the backbone of a reliable agent.', [])
  }

  // 10. No observability.
  if (brains.length && !has('observability')) {
    add('info', 'reliability', 'No observability / tracing', 'Add tracing to record each run’s steps, tool calls, tokens, cost and latency — you’ll need it to debug and to control spend in production.', [])
  }

  // 11. No system prompt.
  if (brains.length && !has('prompt')) {
    add('info', 'correctness', 'No system prompt', 'Define a system prompt: the agent’s role, rules, tone and output format. It’s the cheapest, fastest lever on behavior.', [])
  }

  // 12. Multi-turn chat without memory.
  if (blueprint?.id === 'chatbot' && !has('memory')) {
    add('warn', 'correctness', 'Chatbot has no memory', 'A multi-turn conversational agent needs short-term memory to retain context across turns, or it forgets everything after each message.', [])
  }

  // 13. Tool-using blueprint with no tools.
  if ((blueprint?.id === 'react-tool' || blueprint?.id === 'workflow') && !tools.length) {
    add('warn', 'correctness', 'No tools to act with', 'A tool-using / automation agent needs at least one tool (API, search, DB, action) — otherwise it can only talk, not do.', [])
  }

  // 14. Model capability mismatch.
  for (const a of agents) {
    const m = MODELS[a.config?.model]
    const usesTools = neighborsOf(a.id).some((nb) => nb.kind === 'tool')
    if (m && m.reasoning <= 2 && (usesTools || (a.config?.maxSteps || 0) > 2)) {
      add('info', 'cost', `${a.label || a.name}: model may be too weak`, `Small models struggle with multi-step tool reasoning. For a planner that calls tools, a stronger model (GPT-4o / Claude / Llama 70B) is usually worth it.`, [a.id])
    }
  }
  for (const l of of('llm')) {
    const m = MODELS[l.config?.model]
    if (m && m.tier === 'frontier' && fineTunes.length) {
      add('info', 'cost', `${l.label || l.name}: frontier model for a narrow task`, 'For a fine-tuned classification/extraction task, a small model is far cheaper at scale and often just as good once tuned.', [l.id])
    }
  }

  // 15. Tools without auth.
  for (const t of tools) {
    if (['api', 'db', 'action'].includes(t.config?.toolType) && t.config?.auth === false) {
      add('info', 'safety', `${t.label || t.name}: no authentication`, 'Authenticate and scope tool access with least privilege. An unauthenticated tool the model can call is an open door.', [t.id])
    }
  }

  // 16. Orphan nodes.
  for (const nd of nodes) {
    if (nd.kind === 'app') continue
    if ((adj[nd.id] || []).length === 0) {
      add('warn', 'reliability', `${nd.label || nd.name} is not connected`, `${nd.label || nd.name} has no connections, so it plays no part in the flow. Wire it in or remove it.`, [nd.id])
    }
  }

  // 17 / 18. Missing entry / output.
  if (nodes.length && !has('app')) add('info', 'correctness', 'No entry point', 'Add a User / App node so a request has somewhere to enter and you can simulate the flow.')
  if (brains.length && !has('output')) add('info', 'correctness', 'No response node', 'Add a Response node so the pipeline has a clear, final output back to the user.')

  // 19. Multiple agents without a supervisor.
  if (agents.length >= 2 && !has('router')) {
    add('info', 'correctness', 'Multiple agents, no supervisor', 'Coordinate several agents with a Supervisor / Router that routes each request to the right specialist.', agents.map((a) => a.id))
  }

  // ── scoring ──
  const penalty = (keep) => findings.filter(keep).reduce((s, f) => s + (LEVEL_WEIGHT[f.level] || 0), 0)
  const isSafety = (c) => SAFETY_CATS.includes(c)
  const safetyScore = clamp(100 - penalty((f) => isSafety(f.category)))
  const designScore = clamp(100 - penalty((f) => !isSafety(f.category)))
  const overall = Math.round((safetyScore + designScore) / 2)

  let verdict
  if (findings.some((f) => f.level === 'critical')) verdict = { label: 'Broken', tone: 'bad' }
  else if (findings.some((f) => f.level === 'high')) verdict = { label: 'Risky', tone: 'bad' }
  else if (overall >= 90) verdict = { label: 'Production-ready', tone: 'good' }
  else if (overall >= 70) verdict = { label: 'Promising', tone: 'warn' }
  else verdict = { label: 'Needs work', tone: 'warn' }

  return { findings, safetyScore, designScore, overall, verdict }
}

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)))
}
