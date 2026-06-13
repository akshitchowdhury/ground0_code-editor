// Flow simulator for the Agentic Studio.
//
// simulateAgent({ nodes, edges }, { mode }) animates the data flow. Links are
// coloured by STAGE so the user can tell the phases apart while it plays:
//   cyan   — live request / response (the main flow)
//   violet — RAG indexing & vector-DB storage (retrieval + ingestion)
//   emerald— observability / eval (offline ops, runs around the request)
//
// `mode` chooses which links animate:
//   'lifecycle' (default) — ingestion → setup → live request → ops sweep (all links)
//   'request'             — only the live request path (App → Agent → Response)
//   'ingestion'           — only the offline RAG indexing (Knowledge → Vector DB)
//
// Verdicts still override colour: 'insecure' → amber, 'blocked' → red X.

export const STAGE_COLORS = {
  request: 'rgb(34 211 238)', // cyan
  ingestion: 'rgb(167 139 250)', // violet
  ops: 'rgb(52 211 153)', // emerald
}
export const STAGE_LEGEND = [
  { key: 'request', color: STAGE_COLORS.request, label: 'Request / response' },
  { key: 'ingestion', color: STAGE_COLORS.ingestion, label: 'RAG indexing / storage' },
  { key: 'ops', color: STAGE_COLORS.ops, label: 'Observability / eval' },
]

export const FLOW_MODES = [
  { id: 'lifecycle', label: 'Full lifecycle (all links)' },
  { id: 'request', label: 'Live request only' },
  { id: 'ingestion', label: 'Ingestion (RAG indexing)' },
]

export function simulateAgent({ nodes = [], edges = [] }, { mode = 'lifecycle' } = {}) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const find = (kind) => nodes.find((n) => n.kind === kind)
  const name = (id) => byId[id]?.label || byId[id]?.name || id
  const edgeBetween = (a, b) => edges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a))

  const steps = []
  const covered = new Set()
  let blocked = false

  function pushReal(fromId, toId, { packet, note, verdict = 'ok', color = STAGE_COLORS.request }) {
    const real = edgeBetween(fromId, toId)
    if (!real) return false
    covered.add(real.id)
    steps.push({ edge: real, from: fromId, to: toId, packet, note, verdict, color })
    return true
  }
  function hop(fromId, toId, { packet, note, verdict = 'ok', color = STAGE_COLORS.request }) {
    if (blocked) return
    const real = edgeBetween(fromId, toId)
    if (!real) {
      steps.push({ edge: { id: `v${steps.length}` }, from: fromId, to: toId, packet: '✗', verdict: 'blocked', note: `No connection between ${name(fromId)} and ${name(toId)} — draw the wire so data can flow.` })
      blocked = true
      return
    }
    covered.add(real.id)
    steps.push({ edge: real, from: fromId, to: toId, packet, note, verdict, color })
  }
  function leg(fromId, toId, packet, note, { verdict = 'ok', color = STAGE_COLORS.request } = {}) {
    if (blocked) return
    steps.push({ edge: { id: `v${steps.length}` }, from: fromId, to: toId, packet, note, verdict, color })
  }
  const done = () => ({ ok: !blocked, blockedAt: blocked ? steps.length - 1 : null, steps, mode, reason: steps.length ? null : 'Nothing to simulate yet — wire up the pipeline first.' })

  const data = find('data'), embedder = find('embedder'), vdb = find('vectordb'), retriever = find('retriever')
  const guardrail = find('guardrail'), router = find('router'), out = find('output')
  const promptNode = find('prompt'), memNode = find('memory')

  // ── INGESTION (offline, RAG indexing) — violet ──
  function ingestion() {
    if (data && embedder) pushReal(data.id, embedder.id, { packet: 'chunks', color: STAGE_COLORS.ingestion, note: 'Offline ingestion (runs once, before any request): your documents are split into chunks…' })
    if (embedder && vdb) pushReal(embedder.id, vdb.id, { packet: 'vectors', color: STAGE_COLORS.ingestion, note: '…embedded into vectors and indexed in the vector DB, ready to be searched at query time.' })
  }

  if (mode === 'ingestion') {
    ingestion()
    return done()
  }

  const entry = find('app')
  if (!entry) return { ok: false, reason: 'Add a User / App node to simulate an incoming request.', steps: [], mode }
  const brain = find('agent') || find('llm')
  if (!brain) return { ok: false, reason: 'Add an Agent or LLM — the pipeline has nothing to reason with.', steps: [], mode }

  if (mode === 'lifecycle') ingestion()

  // ── SETUP (loaded each request) — cyan ──
  if (promptNode) pushReal(promptNode.id, brain.id, { packet: 'system prompt', note: 'The agent starts each request with its system prompt — role, rules and output format.' })
  if (memNode) pushReal(memNode.id, brain.id, { packet: 'history', note: 'Conversation memory is loaded so the agent remembers the context of the chat.' })

  // ── LIVE REQUEST — cyan ──
  const secure = !!guardrail
  if (guardrail) hop(entry.id, guardrail.id, { packet: 'request', note: `${entry.name} sends the request in — guardrails screen it first (prompt-injection, PII, toxicity).` })
  const preBrain = guardrail ? guardrail.id : entry.id

  if (router) {
    hop(preBrain, router.id, { packet: secure ? 'clean input' : 'request', verdict: secure ? 'ok' : 'insecure', note: secure ? 'The screened request reaches the supervisor, which decides which agent should handle it.' : 'The request reaches the supervisor with no guardrail screening it first (prompt-injection risk).' })
    hop(router.id, brain.id, { packet: 'route', note: `The supervisor routes the request to ${brain.label || brain.name}.` })
  } else {
    hop(preBrain, brain.id, { packet: secure ? 'clean input' : 'request', verdict: secure ? 'ok' : 'insecure', note: secure ? 'The input passes the guardrail and reaches the agent.' : 'The request reaches the agent — but no guardrail screened it first. Untrusted input straight to the model is a prompt-injection risk.' })
  }

  // RAG query round-trip — violet (touches the vector DB)
  if (retriever && !blocked) {
    hop(brain.id, retriever.id, { packet: 'query', color: STAGE_COLORS.ingestion, note: 'The agent needs facts, so it queries the retriever.' })
    if (!blocked) {
      if (vdb) {
        hop(retriever.id, vdb.id, { packet: 'similarity search', color: STAGE_COLORS.ingestion, note: 'The retriever embeds the query and searches the vector DB for the top-k closest chunks.' })
        leg(vdb.id, retriever.id, 'top-k chunks', 'The most relevant chunks come back…', { color: STAGE_COLORS.ingestion })
        leg(retriever.id, brain.id, 'context', '…and are handed to the agent as grounding context (this is RAG).', { color: STAGE_COLORS.ingestion })
      } else {
        leg(retriever.id, retriever.id, 'no vector DB', 'The retriever has no vector database to search — the RAG pipeline is incomplete.', { verdict: 'blocked' })
        blocked = true
      }
    }
  }

  // Tool act → observe — cyan
  const toolNeighbor = edges
    .filter((e) => e.from === brain.id || e.to === brain.id)
    .map((e) => (e.from === brain.id ? e.to : e.from))
    .map((id) => byId[id])
    .find((nd) => nd && nd.kind === 'tool')
  if (toolNeighbor && !blocked) {
    const sideFx = toolNeighbor.config?.sideEffecting || toolNeighbor.config?.write
    const human = find('human')
    const humanWired = human && (edgeBetween(brain.id, human.id) || edgeBetween(human.id, toolNeighbor.id))
    if (sideFx && humanWired) {
      hop(brain.id, human.id, { packet: 'approve?', note: `The agent wants to run ${toolNeighbor.name} (an irreversible action) — a human reviews and approves first.` })
      hop(human.id, toolNeighbor.id, { packet: 'approved ✓', note: 'Approved — the action runs safely under human oversight.' })
    } else {
      hop(brain.id, toolNeighbor.id, { packet: 'tool call', verdict: sideFx ? 'insecure' : 'ok', note: sideFx ? `${toolNeighbor.name} runs an irreversible action with no human approval — risky.` : `The agent calls ${toolNeighbor.name} and waits for the result.` })
    }
    leg(toolNeighbor.id, brain.id, 'observation', 'The result flows back and the agent reasons again — the act → observe loop at the heart of an agent.')
  }

  // Response → and back to the user — cyan
  if (out && !blocked) {
    hop(brain.id, out.id, { packet: 'final answer', note: 'The agent finishes and produces the final response.' })
    leg(out.id, entry.id, 'response ✓', `The response travels back to ${entry.name} — the user has their answer. Request complete.`)
  } else if (!out && !blocked) {
    leg(brain.id, entry.id, 'answer ✓', `The agent’s answer is returned to ${entry.name} — request complete. (Add a Response node to mark the output explicitly.)`)
  }

  // ── SUPPORTING SWEEP (lifecycle only) — animate every remaining wired link ──
  if (mode === 'lifecycle' && !blocked) {
    for (const e of edges) {
      if (covered.has(e.id)) continue
      const a = byId[e.from], b = byId[e.to]
      if (!a || !b) continue
      const role = supportingRole(a, b)
      steps.push({ edge: e, from: e.from, to: e.to, packet: role.packet, note: role.note, verdict: 'ok', color: role.color })
      covered.add(e.id)
    }
  }

  return done()
}

// Role + note + stage colour for a "supporting" link off the live request path.
function supportingRole(a, b) {
  const kinds = [a.kind, b.kind]
  const has = (k) => kinds.includes(k)
  if (has('eval')) return { packet: 'test cases', color: STAGE_COLORS.ops, note: 'Offline — the eval set scores the agent against fixed test cases. This runs in CI / before deploy, not during a live request.' }
  if (has('observability')) return { packet: 'trace', color: STAGE_COLORS.ops, note: 'Continuous — every step (tokens, tool calls, cost, latency) is traced to observability for debugging and monitoring.' }
  if (has('training')) return { packet: 'training data', color: STAGE_COLORS.ingestion, note: 'Offline — this dataset fine-tunes / aligns the model ahead of time, not at request time.' }
  if (has('human')) return { packet: 'oversight', color: STAGE_COLORS.request, note: 'A human can step in to approve risky or low-confidence actions.' }
  if (has('memory')) return { packet: 'memory', color: STAGE_COLORS.request, note: 'Conversation / long-term memory is read and written across turns.' }
  if (has('prompt')) return { packet: 'system', color: STAGE_COLORS.request, note: 'The system prompt configures the model on every call.' }
  if (has('data') || has('embedder') || has('vectordb')) return { packet: 'index', color: STAGE_COLORS.ingestion, note: 'Part of the offline ingestion pipeline that indexes your knowledge.' }
  if (has('tool')) return { packet: 'tool', color: STAGE_COLORS.request, note: 'A tool the agent can call when it decides to act.' }
  if (has('router') || has('agent')) return { packet: 'route', color: STAGE_COLORS.request, note: 'The supervisor can dispatch a request to this agent.' }
  return { packet: 'data', color: STAGE_COLORS.request, note: 'A supporting connection in the pipeline.' }
}
