// Build profile for the Agentic Studio — turns a design into "what kind of
// agent this produces": its archetype, the customization method (prompting /
// RAG / fine-tuning / RLHF) and the resulting capabilities, effort and data
// needs. This is the "training principles → resulting agent" view (req #4).
import { MODELS, AGENT_PATTERNS } from '../../data/cloud/agentComponents.js'

// Customization method → what you get. The heart of the combinations table.
const METHOD_PROFILE = {
  'Zero-shot prompting': { effort: 'Lowest', data: 'None', result: 'A general assistant driven entirely by instructions.', note: 'Quality rides on the base model and prompt. Adds no new knowledge or specialized behavior — but it’s instant and free to iterate.' },
  'Few-shot prompting': { effort: 'Low', data: 'A handful of examples', result: 'A steerable assistant that mimics your examples in-context.', note: 'Great for locking in a format or tone with zero training.' },
  'Prompted + RAG': { effort: 'Medium', data: 'Documents to index', result: 'A knowledgeable assistant grounded in your live data.', note: 'Updatable without retraining, can cite sources, and cuts hallucination. The default for Q&A over private/fresh data.' },
  'Fine-tuned': { effort: 'High', data: '100s–1000s of labeled examples', result: 'A specialist tuned for a narrow style, format or skill.', note: 'Bakes in behavior, not facts. Needs a solid eval set to avoid silent regressions.' },
  'Fine-tuned + RAG': { effort: 'Highest', data: 'Labeled examples + documents', result: 'A specialist that also answers from live data — the strongest combination.', note: 'Behavior comes from tuning, knowledge from retrieval. Most moving parts to maintain.' },
  'RLHF / preference-aligned': { effort: 'Very high', data: 'Human preference comparisons', result: 'An aligned, on-brand conversational agent.', note: 'Aligns tone and safety — not knowledge. Normally applied after supervised fine-tuning.' },
}

export function buildProfile({ nodes = [] }) {
  const of = (kind) => nodes.filter((n) => n.kind === kind)
  const has = (kind) => nodes.some((n) => n.kind === kind)
  const agents = of('agent')
  const llms = of('llm')
  const brains = [...agents, ...llms]
  const tools = of('tool')
  const trainings = of('training')
  const promptNode = of('prompt')[0]

  if (!brains.length) {
    return { empty: true, archetype: 'Empty pipeline', summary: 'Add an Agent or LLM, then wire up knowledge, tools and safety to see what kind of agent you’re building.' }
  }

  const hasRAG = has('retriever') && has('vectordb')
  const fineTune = trainings.some((t) => t.config?.method === 'fine-tune')
  const rlhf = trainings.some((t) => t.config?.method === 'rlhf')
  const fewShot = !!promptNode?.config?.fewShot
  const memNode = of('memory')[0]

  // Customization method (combination → outcome).
  let method
  if (rlhf) method = 'RLHF / preference-aligned'
  else if (fineTune && hasRAG) method = 'Fine-tuned + RAG'
  else if (fineTune) method = 'Fine-tuned'
  else if (hasRAG) method = 'Prompted + RAG'
  else if (fewShot) method = 'Few-shot prompting'
  else method = 'Zero-shot prompting'
  const methodInfo = METHOD_PROFILE[method]

  // Archetype.
  const primary = agents[0] || llms[0]
  const pattern = primary?.config?.pattern
  let archetype
  if (has('router') || agents.length >= 2) archetype = 'Multi-agent system'
  else if (tools.length && agents.length) archetype = 'Tool-using agent (ReAct)'
  else if (hasRAG) archetype = 'Retrieval-augmented assistant'
  else if (fineTune && !agents.length) archetype = 'Fine-tuned specialist'
  else if (memNode && agents.length) archetype = 'Conversational agent'
  else if (llms.length && !agents.length) archetype = 'Single LLM call'
  else archetype = 'Basic agent'

  // Capabilities.
  const capabilities = []
  if (hasRAG) capabilities.push('Answers grounded in your documents (RAG)')
  if (tools.length) capabilities.push(`Takes actions through ${tools.length} tool${tools.length > 1 ? 's' : ''}`)
  if (memNode) capabilities.push(memNode.config?.memType === 'long' ? 'Remembers facts across sessions' : 'Remembers the conversation')
  if (has('router') || agents.length >= 2) capabilities.push('Delegates to specialist agents')
  if (has('guardrail')) capabilities.push('Filters unsafe input / output')
  if (has('human')) capabilities.push('Routes risky actions to a human')
  if (!capabilities.length) capabilities.push('Generates text from the prompt alone')

  // Model + cost/latency estimate.
  const model = MODELS[primary?.config?.model]
  const steps = agents[0]?.config?.maxSteps || 1
  let costLevel = 'Medium'
  if (model?.tier === 'frontier' && steps > 4) costLevel = 'High'
  else if (model?.tier === 'small' && steps <= 3) costLevel = 'Low'

  const traits = [
    { label: 'Model', value: model ? `${model.label}` : '—' },
    { label: 'Customization', value: method },
    { label: 'Reasoning', value: agents.length ? AGENT_PATTERNS[pattern] || pattern || 'loop' : 'single-shot' },
    { label: 'Build effort', value: methodInfo.effort },
    { label: 'Data needed', value: methodInfo.data },
    { label: 'Est. cost / latency', value: costLevel },
  ]

  return {
    empty: false,
    archetype,
    summary: methodInfo.result,
    note: methodInfo.note,
    method,
    traits,
    capabilities,
  }
}
