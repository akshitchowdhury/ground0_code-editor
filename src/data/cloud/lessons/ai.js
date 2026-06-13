// AI, ML & LLMs — beginner-friendly lessons with interactive flow boards.
// Block format matches src/data/tutorials (LessonContent renders it).

export default [
  {
    id: 'what-is-ml',
    title: 'What is Machine Learning?',
    summary: 'Learning patterns from data instead of writing the rules by hand.',
    blocks: [
      {
        type: 'p',
        text: 'Traditional programming: a human writes the **rules**, the computer applies them. **Machine learning** flips this — you show the computer **examples**, and it figures out the rules (a mathematical function) on its own.',
      },
      { type: 'h3', text: 'Train, then infer' },
      {
        type: 'list',
        items: [
          '**Training** — feed the model many examples, each an input **X** and the correct answer **y**. It adjusts itself to fit them.',
          '**Inference** — give the trained model a *new* input and it predicts an output.',
          '**Features** are the inputs (pixels, words, numbers); the **label** is what you want to predict.',
          'The goal is **generalization** — doing well on data it has never seen, not memorizing the training set (**overfitting**).',
        ],
      },
      { type: 'h3', text: 'Three flavors' },
      {
        type: 'list',
        items: [
          '**Supervised** — learn from labeled examples (spam / not-spam, house → price). Most common.',
          '**Unsupervised** — find structure in unlabeled data (clustering customers, anomaly detection).',
          '**Reinforcement** — an agent learns by trial and error to maximize a reward (game-playing, robotics).',
        ],
      },
    ],
    flow: {
      title: 'From training data to a prediction',
      w: 760,
      h: 320,
      nodes: [
        { id: 'data', x: 20, y: 40, icon: '🗂️', label: 'Labeled data', sub: 'X → y' },
        { id: 'train', x: 250, y: 40, icon: '🔁', label: 'Training', sub: 'fit the data' },
        { id: 'model', x: 250, y: 230, icon: '🧠', label: 'Model', sub: 'learned function' },
        { id: 'newx', x: 20, y: 230, icon: '❓', label: 'New input X' },
        { id: 'out', x: 510, y: 230, icon: '🎯', label: 'Prediction ŷ' },
      ],
      edges: [
        { from: 'data', to: 'train', label: 'examples' },
        { from: 'train', to: 'model', dashed: true, label: 'updates' },
        { from: 'newx', to: 'model', label: 'infer' },
        { from: 'model', to: 'out', label: 'predict' },
      ],
      steps: [
        { from: 'data', to: 'train', packet: 'thousands of (X, y)', text: 'Training: feed the model many labeled examples — each an input X and its correct answer y.' },
        { from: 'train', to: 'model', packet: 'adjust parameters', text: 'The model tweaks its internal numbers to minimize its errors on the data. It learns the underlying pattern — not the individual rows.' },
        { from: 'newx', to: 'model', packet: 'unseen input', text: 'Inference: later, hand the trained model a brand-new input it has never encountered.' },
        { from: 'model', to: 'out', packet: 'ŷ', text: 'It outputs a prediction by applying the function it learned. Doing this well on new data — generalization — is the entire point.' },
      ],
    },
  },

  {
    id: 'neural-networks',
    title: 'Neural networks: how models learn',
    summary: 'Neurons, weights, the forward pass, and learning by backpropagation.',
    blocks: [
      {
        type: 'p',
        text: 'A **neural network** is layers of simple units (**neurons**). Each neuron computes a **weighted sum** of its inputs, adds a bias, and passes it through an **activation function** (a non-linearity). Stack enough layers and the network can approximate astonishingly complex functions — that is **deep learning**.',
      },
      { type: 'h3', text: 'The learning loop' },
      {
        type: 'list',
        items: [
          '**Forward pass** — inputs flow through the layers to produce a prediction.',
          '**Loss** — a function scores how wrong that prediction is versus the true label.',
          '**Backpropagation** — the error is sent backwards to compute each weight’s contribution (its gradient).',
          '**Gradient descent** — every weight is nudged slightly to reduce the loss. The **learning rate** sets the step size.',
        ],
      },
      {
        type: 'p',
        text: 'Repeat over the dataset many times (**epochs**) and the loss falls — the model learns. A modern model has millions-to-billions of these weights (**parameters**), which is why training runs on **GPUs** built for massive matrix math.',
      },
    ],
    flow: {
      title: 'Forward pass, then learn by backprop',
      w: 820,
      h: 300,
      nodes: [
        { id: 'x', x: 20, y: 120, icon: '🔢', label: 'Input', sub: 'features' },
        { id: 'hidden', x: 230, y: 120, icon: '🕸️', label: 'Hidden layers', sub: 'weights + activation' },
        { id: 'output', x: 450, y: 120, icon: '📤', label: 'Output', sub: 'prediction' },
        { id: 'loss', x: 660, y: 120, icon: '📉', label: 'Loss', sub: 'vs true label' },
      ],
      edges: [
        { from: 'x', to: 'hidden', label: 'forward' },
        { from: 'hidden', to: 'output' },
        { from: 'output', to: 'loss' },
        { from: 'loss', to: 'hidden', dashed: true, label: 'backprop' },
      ],
      steps: [
        { from: 'x', to: 'hidden', packet: 'weighted sums', text: 'Forward pass: each input is multiplied by a weight, summed with others, and squashed by an activation function.' },
        { from: 'hidden', to: 'output', packet: 'features → prediction', text: 'Layer by layer, simple signals combine into complex features, ending in a prediction.' },
        { from: 'output', to: 'loss', packet: 'compare to y', text: 'A loss function measures how far the prediction is from the true label.' },
        { from: 'loss', to: 'hidden', packet: 'gradients ◀', reverse: true, text: 'Backpropagation sends the error backwards, computing how much each weight contributed to it.' },
        { from: 'hidden', to: 'hidden', packet: 'nudge weights', text: 'Gradient descent adjusts every weight a little in the direction that lowers the loss. Repeat over millions of examples → the network learns.' },
      ],
    },
  },

  {
    id: 'how-llms-work',
    title: 'How an LLM works',
    summary: 'Tokens, embeddings, the transformer, and generating one token at a time.',
    blocks: [
      {
        type: 'p',
        text: 'A **Large Language Model** is a giant neural network trained on enormous amounts of text to do one deceptively simple thing: **predict the next token**. Everything it appears to "understand" emerges from doing that extremely well, billions of parameters deep.',
      },
      { type: 'h3', text: 'The pipeline' },
      {
        type: 'list',
        items: [
          '**Tokenization** — text is split into **tokens** (subword pieces). "tokenizer" might be `token` + `izer`.',
          '**Embeddings** — each token becomes a high-dimensional **vector** that encodes meaning; similar words sit nearby.',
          '**Transformer + self-attention** — every token looks at every other token and weighs how relevant it is. That is how the model tracks context across a sentence (or a whole document).',
          '**Context window** — the maximum number of tokens it can attend to at once.',
        ],
      },
      { type: 'h3', text: 'Autoregressive generation' },
      {
        type: 'p',
        text: 'The model outputs a **probability for every possible next token**. One is **sampled** (the **temperature** controls how random), appended to the input, and the whole thing runs again — one token at a time. **Pretraining** teaches raw prediction; **fine-tuning** and **RLHF** make it follow instructions helpfully. Watch the loop on the board.',
      },
    ],
    flow: {
      title: 'Generating text, one token at a time',
      w: 820,
      h: 300,
      nodes: [
        { id: 'prompt', x: 20, y: 170, icon: '⌨️', label: 'Prompt', sub: '"The cat"' },
        { id: 'tok', x: 190, y: 170, icon: '✂️', label: 'Tokenizer', sub: 'subword tokens' },
        { id: 'emb', x: 360, y: 170, icon: '🧭', label: 'Embeddings', sub: 'token → vector' },
        { id: 'tf', x: 530, y: 170, icon: '🧠', label: 'Transformer', sub: 'self-attention ×N' },
        { id: 'probs', x: 530, y: 30, icon: '📊', label: 'Next-token probs' },
        { id: 'sample', x: 690, y: 30, icon: '🎲', label: 'Sample → "sat"' },
      ],
      edges: [
        { from: 'prompt', to: 'tok' },
        { from: 'tok', to: 'emb' },
        { from: 'emb', to: 'tf' },
        { from: 'tf', to: 'probs' },
        { from: 'probs', to: 'sample' },
        { from: 'sample', to: 'tok', dashed: true, label: 'append & repeat' },
      ],
      steps: [
        { from: 'prompt', to: 'tok', packet: '"The cat"', text: 'Your text enters the tokenizer.' },
        { from: 'tok', to: 'emb', packet: '[The][ cat]', text: 'It is split into tokens — subword pieces, not whole words.' },
        { from: 'emb', to: 'tf', packet: 'vectors', text: 'Each token maps to a high-dimensional embedding vector that captures its meaning.' },
        { from: 'tf', to: 'probs', packet: 'attention ×N', text: 'Vectors pass through stacked transformer layers. Self-attention lets every token weigh every other — that is how context is tracked.' },
        { from: 'probs', to: 'sample', packet: 'sat 61% · ran 12% …', text: 'The final layer gives a probability for every possible next token. We sample one (temperature controls the randomness): "sat".' },
        { from: 'sample', to: 'tok', packet: '"The cat sat" ↻', reverse: true, text: 'The chosen token is appended to the input, and the whole network runs again. One token at a time — that is autoregressive generation.' },
      ],
    },
  },

  {
    id: 'embeddings-rag',
    title: 'Embeddings & vector databases (RAG)',
    summary: 'Give an LLM your own knowledge with semantic search — not retraining.',
    blocks: [
      {
        type: 'p',
        text: 'An LLM only knows what it saw in training — not your private docs, and nothing newer than its cutoff. **Retrieval-Augmented Generation (RAG)** fixes this by *finding* relevant text at query time and pasting it into the prompt as context.',
      },
      { type: 'h3', text: 'Embeddings = meaning as coordinates' },
      {
        type: 'list',
        items: [
          'An **embedding model** turns text into a **vector** (a list of numbers). Texts with similar meaning land near each other in this space.',
          '**Similarity** is measured by **cosine distance** between vectors — so "car" and "automobile" score as close, even with no shared words. This is **semantic search**, not keyword matching.',
          'A **vector database** (pgvector, Pinecone, Weaviate, FAISS) stores millions of vectors and finds the nearest ones fast using an **ANN** index (e.g. HNSW).',
        ],
      },
      { type: 'h3', text: 'The RAG pipeline' },
      {
        type: 'p',
        text: '**Ingest once:** split documents into chunks, embed them, store the vectors. **At query time:** embed the question, retrieve the **top-k** closest chunks, stuff them into the prompt, and let the LLM answer **grounded** in that context. RAG cuts hallucination, adds fresh/private knowledge, and lets you cite sources — all without retraining the model.',
      },
    ],
    flow: {
      title: 'Retrieval-Augmented Generation',
      w: 820,
      h: 340,
      nodes: [
        { id: 'docs', x: 20, y: 30, icon: '📚', label: 'Your documents' },
        { id: 'embi', x: 220, y: 30, icon: '🧬', label: 'Embed model', sub: 'text → vector' },
        { id: 'vdb', x: 430, y: 140, icon: '🗃️', label: 'Vector DB', sub: 'ANN index' },
        { id: 'q', x: 20, y: 250, icon: '❓', label: 'Question' },
        { id: 'embq', x: 220, y: 250, icon: '🧬', label: 'Embed model' },
        { id: 'llm', x: 640, y: 140, icon: '🧠', label: 'LLM' },
        { id: 'ans', x: 640, y: 20, icon: '✅', label: 'Grounded answer' },
      ],
      edges: [
        { from: 'docs', to: 'embi', label: 'chunk' },
        { from: 'embi', to: 'vdb', label: 'store', dashed: true },
        { from: 'q', to: 'embq' },
        { from: 'embq', to: 'vdb', label: 'search' },
        { from: 'vdb', to: 'llm', label: 'top-k chunks' },
        { from: 'llm', to: 'ans' },
      ],
      steps: [
        { from: 'docs', to: 'embi', packet: 'split into chunks', text: 'Ingestion (done once): your documents are split into chunks and sent to an embedding model.' },
        { from: 'embi', to: 'vdb', packet: 'vectors', text: 'Each chunk becomes a vector, stored in a vector database with an ANN index for fast nearest-neighbor search.' },
        { from: 'q', to: 'embq', packet: 'user question', text: 'At query time, the user’s question is embedded with the same model.' },
        { from: 'embq', to: 'vdb', packet: 'query vector', text: 'The vector DB finds the top-k chunks whose vectors are closest (cosine similarity) — semantic search, not keywords.' },
        { from: 'vdb', to: 'llm', packet: 'relevant chunks', text: 'Those chunks are inserted into the prompt as context alongside the question.' },
        { from: 'llm', to: 'ans', packet: 'grounded answer', text: 'The LLM answers using your data — reducing hallucination and adding private/fresh knowledge, with no retraining. That is RAG.' },
      ],
    },
  },

  {
    id: 'agentic-workflows',
    title: 'Agentic workflows',
    summary: 'An LLM that reasons, calls tools, observes results, and loops until done.',
    blocks: [
      {
        type: 'p',
        text: 'A plain LLM only produces text. An **agent** wraps it in a **loop** and gives it **tools** — so it can take actions in the world: search the web, call APIs, query databases, run code. The model decides *what to do next*, the system executes it, and the result feeds back in.',
      },
      { type: 'h3', text: 'The ReAct loop' },
      {
        type: 'list',
        items: [
          '**Reason** — the LLM thinks about the goal and plans the next step.',
          '**Act** — it picks a **tool** and arguments (this is **function / tool calling**).',
          '**Observe** — the tool runs and returns a real result the model didn’t already know.',
          'Loop until the goal is met, then give the final answer.',
        ],
      },
      { type: 'h3', text: 'What makes it work' },
      {
        type: 'p',
        text: '**Memory** carries state across steps (a scratchpad short-term, a vector store long-term) so the agent doesn’t lose the thread on long tasks. **Guardrails** keep it safe (limited tools, step limits, human approval for risky actions). Stretch further and multiple specialized agents collaborate — a planner delegating to workers. The formula: **LLM + tools + a loop + memory**.',
      },
    ],
    flow: {
      title: 'Reason → Act → Observe, until done',
      w: 820,
      h: 360,
      nodes: [
        { id: 'goal', x: 20, y: 160, icon: '🎯', label: 'User goal' },
        { id: 'agent', x: 240, y: 160, icon: '🤖', label: 'LLM agent', sub: 'plan → act' },
        { id: 'tool', x: 480, y: 40, icon: '🛠️', label: 'Tool call', sub: 'API / DB / search' },
        { id: 'obs', x: 660, y: 40, icon: '🔍', label: 'Observation' },
        { id: 'mem', x: 480, y: 280, icon: '📝', label: 'Memory', sub: 'scratchpad' },
        { id: 'answer', x: 660, y: 250, icon: '✅', label: 'Final answer' },
      ],
      edges: [
        { from: 'goal', to: 'agent' },
        { from: 'agent', to: 'tool', label: 'act' },
        { from: 'tool', to: 'obs' },
        { from: 'obs', to: 'agent', dashed: true, label: 'observe' },
        { from: 'agent', to: 'mem', dashed: true, label: 'remember' },
        { from: 'agent', to: 'answer', label: 'when done' },
      ],
      steps: [
        { from: 'goal', to: 'agent', packet: '"Book cheapest flight"', text: 'The user gives a goal: "Book the cheapest flight to Tokyo next month."' },
        { from: 'agent', to: 'tool', packet: 'search_flights(…)', text: 'The LLM reasons about the next step and chooses a tool — calling a flight-search API with parameters it decides.' },
        { from: 'tool', to: 'obs', packet: 'results', text: 'The tool runs and returns real data the model did not have on its own.' },
        { from: 'obs', to: 'agent', packet: 'observation ◀', reverse: true, text: 'The agent observes the result and reasons again: enough info, or call another tool? This Reason → Act → Observe cycle is the heart of an agent.' },
        { from: 'agent', to: 'mem', packet: 'save state', text: 'It records progress in memory so it keeps track across many steps on a long task.' },
        { from: 'agent', to: 'answer', packet: 'goal met ✓', text: 'Once the goal is satisfied, it exits the loop and returns the final answer. An agent = an LLM + tools + a loop + memory.' },
      ],
    },
  },
]
