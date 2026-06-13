// Starter agent pipelines for the Agentic Studio. build() returns fresh
// node/edge objects so the canvas can mutate them freely. Blueprint ids match
// AGENT_BLUEPRINTS[].template; 'risky-draft' is a deliberately bad demo.

function n(id, type, kind, name, icon, x, y, config = {}) {
  return { id, type, kind, name, icon, x, y, config: { ...config } }
}
function e(id, from, to, label) {
  return label ? { id, from, to, label } : { id, from, to }
}

export const AGENT_TEMPLATES = {
  'rag-qa': {
    name: 'RAG Q&A Assistant',
    blueprint: 'rag-qa',
    build: () => ({
      nodes: [
        n('user', 'user', 'app', 'User / App', '👤', 40, 300),
        n('gr', 'guardrail', 'guardrail', 'Guardrails', '🛡️', 240, 300),
        n('agent', 'agent', 'agent', 'Agent', '🤖', 460, 300, { pattern: 'react', maxSteps: 4, model: 'gpt-4o-mini' }),
        n('prompt', 'prompt', 'prompt', 'System prompt', '⚙️', 460, 150, { fewShot: false }),
        n('ret', 'retriever', 'retriever', 'Retriever', '🔎', 700, 460, { topK: 5 }),
        n('know', 'knowledge', 'data', 'Knowledge', '📚', 40, 470, { source: 'docs' }),
        n('emb', 'embedder', 'embedder', 'Embedder', '🧬', 260, 470),
        n('vdb', 'vectordb', 'vectordb', 'Vector DB', '🗃️', 480, 470),
        n('resp', 'response', 'output', 'Response', '💬', 920, 300),
        n('eval', 'eval', 'eval', 'Eval set', '✅', 700, 150, { examples: 60 }),
        n('obs', 'observability', 'observability', 'Observability', '📊', 920, 150),
      ],
      edges: [
        e('e1', 'user', 'gr'), e('e2', 'gr', 'agent'), e('e3', 'prompt', 'agent', 'system'),
        e('e4', 'agent', 'ret', 'query'), e('e5', 'ret', 'vdb', 'top-k'),
        e('e6', 'know', 'emb', 'chunk'), e('e7', 'emb', 'vdb', 'store'),
        e('e8', 'agent', 'resp'), e('e9', 'eval', 'agent'), e('e10', 'obs', 'agent'),
      ],
    }),
  },

  chatbot: {
    name: 'Conversational Chatbot',
    blueprint: 'chatbot',
    build: () => ({
      nodes: [
        n('user', 'user', 'app', 'User / App', '👤', 40, 280),
        n('gr', 'guardrail', 'guardrail', 'Guardrails', '🛡️', 240, 280),
        n('agent', 'agent', 'agent', 'Chat agent', '🤖', 460, 280, { pattern: 'react', maxSteps: 4, model: 'gpt-4o-mini' }),
        n('prompt', 'prompt', 'prompt', 'System prompt', '⚙️', 460, 140),
        n('mem', 'memory_short', 'memory', 'Short memory', '📝', 460, 440, { memType: 'short' }),
        n('resp', 'response', 'output', 'Response', '💬', 700, 280),
        n('eval', 'eval', 'eval', 'Eval set', '✅', 240, 440, { examples: 50 }),
        n('obs', 'observability', 'observability', 'Observability', '📊', 700, 140),
      ],
      edges: [
        e('e1', 'user', 'gr'), e('e2', 'gr', 'agent'), e('e3', 'prompt', 'agent', 'system'),
        e('e4', 'mem', 'agent', 'history'), e('e5', 'agent', 'resp'),
        e('e6', 'eval', 'agent'), e('e7', 'obs', 'agent'),
      ],
    }),
  },

  'react-tool': {
    name: 'Tool-using Agent',
    blueprint: 'react-tool',
    build: () => ({
      nodes: [
        n('user', 'user', 'app', 'User / App', '👤', 40, 300),
        n('gr', 'guardrail', 'guardrail', 'Guardrails', '🛡️', 240, 300),
        n('agent', 'agent', 'agent', 'ReAct agent', '🤖', 460, 300, { pattern: 'react', maxSteps: 6, model: 'gpt-4o' }),
        n('prompt', 'prompt', 'prompt', 'System prompt', '⚙️', 460, 150),
        n('search', 'tool_search', 'tool', 'Web search', '🌐', 720, 170, { toolType: 'search', sideEffecting: false, auth: false }),
        n('api', 'tool_api', 'tool', 'API tool', '🔌', 720, 310, { toolType: 'api', sideEffecting: false, auth: true }),
        n('human', 'human', 'human', 'Human review', '🙋', 720, 450),
        n('action', 'tool_action', 'tool', 'Action', '✉️', 940, 450, { toolType: 'action', sideEffecting: true, auth: true }),
        n('mem', 'memory_short', 'memory', 'Short memory', '📝', 240, 460, { memType: 'short' }),
        n('resp', 'response', 'output', 'Response', '💬', 960, 300),
        n('eval', 'eval', 'eval', 'Eval set', '✅', 460, 460, { examples: 50 }),
        n('obs', 'observability', 'observability', 'Observability', '📊', 960, 150),
      ],
      edges: [
        e('e1', 'user', 'gr'), e('e2', 'gr', 'agent'), e('e3', 'prompt', 'agent', 'system'),
        e('e4', 'agent', 'search', 'act'), e('e5', 'agent', 'api', 'act'),
        e('e6', 'agent', 'human', 'approve?'), e('e7', 'human', 'action', 'run'),
        e('e8', 'mem', 'agent', 'history'), e('e9', 'agent', 'resp'),
        e('e10', 'eval', 'agent'), e('e11', 'obs', 'agent'),
      ],
    }),
  },

  workflow: {
    name: 'Automation Workflow',
    blueprint: 'workflow',
    build: () => ({
      nodes: [
        n('user', 'user', 'app', 'Trigger / App', '👤', 40, 300),
        n('gr', 'guardrail', 'guardrail', 'Guardrails', '🛡️', 240, 300),
        n('agent', 'agent', 'agent', 'Planner agent', '🤖', 460, 300, { pattern: 'plan-execute', maxSteps: 8, model: 'gpt-4o' }),
        n('prompt', 'prompt', 'prompt', 'System prompt', '⚙️', 460, 150),
        n('api', 'tool_api', 'tool', 'API tool', '🔌', 720, 180, { toolType: 'api', sideEffecting: false, auth: true }),
        n('db', 'tool_db', 'tool', 'DB tool', '🗄️', 720, 320, { toolType: 'db', sideEffecting: false, auth: true, write: false }),
        n('human', 'human', 'human', 'Human review', '🙋', 720, 460),
        n('action', 'tool_action', 'tool', 'Action', '✉️', 940, 460, { toolType: 'action', sideEffecting: true, auth: true }),
        n('resp', 'response', 'output', 'Result', '💬', 960, 300),
        n('eval', 'eval', 'eval', 'Eval set', '✅', 460, 460, { examples: 50 }),
        n('obs', 'observability', 'observability', 'Observability', '📊', 960, 150),
      ],
      edges: [
        e('e1', 'user', 'gr'), e('e2', 'gr', 'agent'), e('e3', 'prompt', 'agent', 'system'),
        e('e4', 'agent', 'api', 'act'), e('e5', 'agent', 'db', 'read'),
        e('e6', 'agent', 'human', 'approve?'), e('e7', 'human', 'action', 'run'),
        e('e8', 'agent', 'resp'), e('e9', 'eval', 'agent'), e('e10', 'obs', 'agent'),
      ],
    }),
  },

  'multi-agent': {
    name: 'Multi-agent System',
    blueprint: 'multi-agent',
    build: () => ({
      nodes: [
        n('user', 'user', 'app', 'User / App', '👤', 40, 300),
        n('gr', 'guardrail', 'guardrail', 'Guardrails', '🛡️', 240, 300),
        n('router', 'router', 'router', 'Supervisor', '🧭', 450, 300),
        n('a1', 'agent', 'agent', 'Research agent', '🤖', 680, 170, { pattern: 'react', maxSteps: 5, model: 'gpt-4o-mini' }),
        n('a2', 'agent', 'agent', 'Writer agent', '🤖', 680, 430, { pattern: 'react', maxSteps: 5, model: 'gpt-4o' }),
        n('search', 'tool_search', 'tool', 'Web search', '🌐', 920, 170, { toolType: 'search', sideEffecting: false, auth: false }),
        n('resp', 'response', 'output', 'Response', '💬', 920, 300),
        n('eval', 'eval', 'eval', 'Eval set', '✅', 450, 460, { examples: 50 }),
        n('obs', 'observability', 'observability', 'Observability', '📊', 240, 160),
      ],
      edges: [
        e('e1', 'user', 'gr'), e('e2', 'gr', 'router'),
        e('e3', 'router', 'a1', 'route'), e('e4', 'router', 'a2', 'route'),
        e('e5', 'a1', 'search', 'act'), e('e6', 'a1', 'resp'), e('e7', 'a2', 'resp'),
        e('e8', 'eval', 'router'), e('e9', 'obs', 'router'),
      ],
    }),
  },

  classifier: {
    name: 'Classifier / Extractor',
    blueprint: 'classifier',
    build: () => ({
      nodes: [
        n('user', 'user', 'app', 'User / App', '👤', 40, 270),
        n('gr', 'guardrail', 'guardrail', 'Guardrails', '🛡️', 240, 270),
        n('llm', 'llm', 'llm', 'LLM (single-shot)', '🧠', 460, 270, { model: 'gpt-4o-mini' }),
        n('prompt', 'prompt', 'prompt', 'System prompt', '⚙️', 460, 130, { fewShot: true }),
        n('ft', 'finetune', 'training', 'Fine-tune', '🎛️', 460, 420, { method: 'fine-tune', examples: 800, labeled: true }),
        n('resp', 'response', 'output', 'Structured output', '💬', 700, 270),
        n('eval', 'eval', 'eval', 'Eval set', '✅', 240, 420, { examples: 200 }),
        n('obs', 'observability', 'observability', 'Observability', '📊', 700, 130),
      ],
      edges: [
        e('e1', 'user', 'gr'), e('e2', 'gr', 'llm'), e('e3', 'prompt', 'llm', 'system'),
        e('e4', 'ft', 'llm', 'tune'), e('e5', 'llm', 'resp'),
        e('e6', 'eval', 'llm'), e('e7', 'obs', 'llm'),
      ],
    }),
  },

  'risky-draft': {
    name: 'Risky draft (fix me)',
    blueprint: 'react-tool',
    build: () => ({
      nodes: [
        n('user', 'user', 'app', 'User / App', '👤', 60, 260),
        n('agent', 'agent', 'agent', 'Agent', '🤖', 320, 260, { pattern: 'react', maxSteps: 0, model: 'llama-8b' }),
        n('action', 'tool_action', 'tool', 'Send email', '✉️', 600, 150, { toolType: 'action', sideEffecting: true, auth: true }),
        n('code', 'tool_code', 'tool', 'Code exec', '🖥️', 600, 360, { toolType: 'code', sideEffecting: true, sandboxed: false, auth: false }),
        n('know', 'knowledge', 'data', 'Company docs', '📚', 60, 440, { source: 'docs' }),
        n('ft', 'finetune', 'training', 'Fine-tune', '🎛️', 320, 440, { method: 'fine-tune', examples: 20, labeled: false }),
        n('resp', 'response', 'output', 'Response', '💬', 860, 260),
      ],
      edges: [
        e('e1', 'user', 'agent'), e('e2', 'agent', 'action', 'act'), e('e3', 'agent', 'code', 'run'),
        e('e4', 'know', 'ft', 'train on'), e('e5', 'ft', 'agent', 'tune'), e('e6', 'agent', 'resp'),
      ],
    }),
  },
}

export function buildAgentTemplate(id) {
  return AGENT_TEMPLATES[id]?.build() || null
}
