// Connection legality for the Agentic Studio — the agent-pipeline analogue of
// src/lib/cloud/rules.js. Agent graphs are hub-and-spoke (the reasoning model is
// the centre, with knowledge / tools / memory / ops as spokes), so instead of a
// strict left→right rank we use a role-based allow-list: for each source kind,
// the set of target kinds it can validly feed. Anything outside the list is
// illogical and is blocked everywhere — the connect tool, the flow simulator and
// the review all consult this one function. The list is permissive enough that
// every built-in blueprint wires up cleanly, but it catches the classic beginner
// mistakes: wiring a Knowledge source straight into the Agent (skipping the RAG
// pipeline), a Tool straight to the Response, or anything into the User entry.

// Allowed target kinds for each source kind.
export const ALLOWED_TARGETS = {
  app: ['guardrail', 'router', 'agent', 'llm'],
  guardrail: ['agent', 'llm', 'router', 'output'],
  prompt: ['agent', 'llm'],
  memory: ['agent', 'llm'],
  training: ['agent', 'llm'],
  data: ['embedder', 'training', 'vectordb'],
  embedder: ['vectordb', 'retriever'],
  vectordb: ['retriever'],
  retriever: ['vectordb', 'agent', 'llm'],
  agent: ['retriever', 'tool', 'human', 'memory', 'output', 'observability', 'router', 'agent', 'llm', 'guardrail'],
  llm: ['tool', 'output', 'observability', 'memory', 'guardrail', 'retriever'],
  router: ['agent', 'llm', 'output', 'observability'],
  tool: ['agent', 'llm', 'human'],
  human: ['tool', 'agent', 'llm', 'output'],
  eval: ['agent', 'llm', 'router'],
  observability: ['agent', 'llm', 'router'],
  output: [], // the response is the end of the line — nothing flows out of it
}

// Friendly role label per kind, used in messages.
export const ROLE = {
  app: 'the entry point',
  output: 'the final response',
  agent: 'the reasoning agent',
  llm: 'the model',
  router: 'the supervisor',
  data: 'a knowledge source',
  embedder: 'the embedding model',
  vectordb: 'the vector database',
  retriever: 'the retriever',
  tool: 'a tool',
  human: 'the human reviewer',
  memory: 'memory',
  prompt: 'the system prompt',
  training: 'a training dataset',
  guardrail: 'guardrails',
  eval: 'the eval set',
  observability: 'observability',
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function suggestTargets(fk) {
  const t = ALLOWED_TARGETS[fk]
  if (!t || !t.length) return ''
  const names = [...new Set(t.map((k) => ROLE[k] || k))]
  return `${cap(ROLE[fk] || fk)} usually connects to: ${names.slice(0, 4).join(', ')}.`
}

// Classify a directed connection from → to.
// Returns { ok, level: 'ok' | 'illegal', code, reason }.
export function classifyAgentEdge(from, to) {
  if (!from || !to) return { ok: false, level: 'illegal', code: 'missing', reason: 'Connection endpoints are missing.' }
  if (from.id === to.id) return { ok: false, level: 'illegal', code: 'self', reason: 'A component cannot connect to itself.' }

  const fk = from.kind
  const tk = to.kind
  const fname = from.label || from.name
  const tname = to.label || to.name

  // The User / App is where requests ENTER — you never wire into it. The reply
  // returns on its own (use a Response node for the explicit final output).
  if (tk === 'app') {
    return {
      ok: false, level: 'illegal', code: 'into-entry',
      reason: `${tname} is the entry point — requests start there, you don't wire into it. The reply returns to the user automatically; connect to a Response node for the final output instead.`,
    }
  }
  // The Response is the end of the pipeline.
  if (fk === 'output') {
    return {
      ok: false, level: 'illegal', code: 'from-output',
      reason: `${fname} is the final response — it's the end of the pipeline, so nothing comes after it. Remove this connection.`,
    }
  }

  const allowed = ALLOWED_TARGETS[fk]
  if (allowed && allowed.includes(tk)) {
    return { ok: true, level: 'ok', code: 'ok', reason: `${fname} → ${tname}.` }
  }

  // Specific, teachable messages for the most common mistakes.
  if (fk === 'data' && (tk === 'agent' || tk === 'llm')) {
    return {
      ok: false, level: 'illegal', code: 'knowledge-direct',
      reason: `A knowledge source can't plug straight into ${tname} — the model can't read raw documents. Build the RAG pipeline: ${fname} → Embedding model → Vector DB → Retriever → ${tname}.`,
    }
  }
  if ((fk === 'vectordb' || fk === 'embedder') && (tk === 'agent' || tk === 'llm')) {
    return {
      ok: false, level: 'illegal', code: 'rag-skip',
      reason: `${fname} feeds the retrieval pipeline, not the model directly. Wire it through a Retriever, then the Retriever to ${tname}.`,
    }
  }
  if (fk === 'tool' && tk === 'output') {
    return {
      ok: false, level: 'illegal', code: 'tool-to-output',
      reason: `A tool's result goes back to the agent to reason over — not straight to the response. Wire ${fname} → Agent → Response.`,
    }
  }

  // Generic fallback with a hint about where this block usually connects.
  return {
    ok: false, level: 'illegal', code: 'invalid',
    reason: `${fname} (${ROLE[fk] || fk}) doesn't connect to ${tname} (${ROLE[tk] || tk}) in an agent pipeline. ${suggestTargets(fk)}`,
  }
}

// Recommended build order shown to beginners (step-by-step guidance).
export const BUILD_STEPS = [
  { n: 1, title: 'Entry & brain', detail: 'Drop a User / App and an Agent (or LLM), then wire User → Agent.' },
  { n: 2, title: 'Steer it', detail: 'Add a System prompt → Agent to set its role, rules and output format.' },
  { n: 3, title: 'Add safety', detail: 'Put Guardrails between the user and the agent: User → Guardrails → Agent.' },
  { n: 4, title: 'Give it knowledge', detail: 'For private facts use RAG: Knowledge → Embedder → Vector DB → Retriever → Agent.' },
  { n: 5, title: 'Let it act', detail: 'Add Tools (Agent → Tool); gate risky actions behind a Human: Agent → Human → Action.' },
  { n: 6, title: 'Finish & measure', detail: 'Add a Response node, plus an Eval set and Observability wired to the agent.' },
]
