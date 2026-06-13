// APIs & Microservices — lessons with interactive flow boards.

export default [
  {
    id: 'rest-apis',
    title: 'APIs & REST',
    summary: 'The contract that lets programs talk: requests, responses, status codes.',
    blocks: [
      {
        type: 'p',
        text: 'An **API** (Application Programming Interface) is a contract: "send me a request shaped like this, and I will answer like that." Web APIs usually speak **HTTP** and exchange **JSON**.',
      },
      { type: 'h3', text: 'REST in 30 seconds' },
      {
        type: 'list',
        items: [
          'Resources live at **URLs**: `/users/42`, `/orders?status=open`.',
          'Verbs say what to do: `GET` (read), `POST` (create), `PUT/PATCH` (update), `DELETE`.',
          'Status codes say how it went: `200` OK, `201` created, `400` bad request, `401` unauthenticated, `404` not found, `500` server error.',
          'Stateless: every request carries everything needed (auth token, parameters).',
        ],
      },
      {
        type: 'code',
        text: 'GET /users/42 HTTP/1.1\nHost: api.shop.dev\nAuthorization: Bearer eyJhbGc…\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{ "id": 42, "name": "Ada", "plan": "pro" }',
      },
      {
        type: 'p',
        text: 'Play the board to follow one API call all the way to the database and back.',
      },
    ],
    flow: {
      title: 'Anatomy of a REST call',
      w: 760,
      h: 330,
      nodes: [
        { id: 'client', x: 20, y: 130, icon: '📱', label: 'Client app', sub: 'mobile / web' },
        { id: 'api', x: 250, y: 130, icon: '⚙️', label: 'API server', sub: 'api.shop.dev' },
        { id: 'db', x: 480, y: 40, icon: '🗄️', label: 'Database', sub: 'PostgreSQL' },
        { id: 'cache', x: 480, y: 230, icon: '⚡', label: 'Cache', sub: 'Redis' },
      ],
      edges: [
        { from: 'client', to: 'api', label: 'HTTPS + JSON' },
        { from: 'api', to: 'db', label: 'SQL' },
        { from: 'api', to: 'cache', label: 'hot keys' },
      ],
      steps: [
        {
          from: 'client',
          to: 'api',
          packet: 'GET /users/42',
          text: 'The client sends GET /users/42 with a Bearer token. The API authenticates the token and validates the request before touching any data.',
        },
        {
          from: 'api',
          to: 'cache',
          packet: 'GET user:42',
          text: 'First stop: the cache. If user 42 was fetched recently, Redis returns it in under a millisecond and the database is never bothered.',
        },
        {
          from: 'cache',
          to: 'api',
          packet: 'MISS',
          text: 'Cache miss this time — the key expired. On to the source of truth.',
        },
        {
          from: 'api',
          to: 'db',
          packet: 'SELECT … WHERE id=42',
          text: 'The API runs a parameterized query (never string-concatenated — that is how SQL injection happens).',
        },
        {
          from: 'db',
          to: 'api',
          packet: '1 row',
          text: 'The row comes back; the API maps it to a response object, stores a copy in the cache with a TTL, and serializes JSON.',
        },
        {
          from: 'api',
          to: 'client',
          packet: '200 OK {json}',
          text: 'The client receives 200 OK with the JSON body. Errors would use the same shape with 4xx/5xx codes — predictable contracts are what make APIs composable.',
        },
      ],
    },
  },

  {
    id: 'api-gateway',
    title: 'API Gateways & Auth',
    summary: 'One front door: routing, authentication, rate limiting.',
    blocks: [
      {
        type: 'p',
        text: 'When you have many services, you don’t want every client talking to each one directly. An **API gateway** is the single front door that handles the cross-cutting concerns once:',
      },
      {
        type: 'list',
        items: [
          '**Routing** — `/users/*` → user service, `/orders/*` → order service.',
          '**Authentication** — verify JWT tokens / API keys before traffic reaches services.',
          '**Rate limiting** — protect backends from abuse (`429 Too Many Requests`).',
          '**TLS termination, logging, CORS** — handled at the edge, not in every service.',
        ],
      },
      { type: 'h3', text: 'Tokens in one paragraph' },
      {
        type: 'p',
        text: 'A client logs in once and receives a **JWT** — a signed JSON token carrying its identity and expiry. Every request presents it in the `Authorization` header; the gateway verifies the signature without a database call. Examples: **Amazon API Gateway**, Kong, NGINX, Envoy.',
      },
    ],
    flow: {
      title: 'A request through the gateway',
      w: 760,
      h: 400,
      nodes: [
        { id: 'app', x: 20, y: 160, icon: '📱', label: 'Client', sub: 'with JWT' },
        { id: 'gw', x: 250, y: 160, icon: '🚪', label: 'API Gateway', sub: 'auth + route + limit' },
        { id: 'auth', x: 250, y: 20, icon: '🔐', label: 'Auth service', sub: 'issues JWTs' },
        { id: 'users', x: 540, y: 60, icon: '👤', label: 'User service' },
        { id: 'orders', x: 540, y: 260, icon: '📦', label: 'Order service' },
      ],
      edges: [
        { from: 'app', to: 'gw' },
        { from: 'gw', to: 'auth', dashed: true, label: 'login only' },
        { from: 'gw', to: 'users', label: '/users/*' },
        { from: 'gw', to: 'orders', label: '/orders/*' },
      ],
      steps: [
        {
          from: 'app',
          to: 'gw',
          packet: 'POST /login',
          text: 'First, login: the client sends credentials to the gateway, which routes them to the auth service.',
        },
        {
          from: 'gw',
          to: 'auth',
          packet: 'credentials',
          text: 'The auth service verifies the password (hashed + salted, never stored in plain text) and signs a JWT valid for, say, one hour.',
        },
        {
          from: 'auth',
          to: 'app',
          packet: 'JWT eyJhbGc…',
          text: 'The token travels back to the client, which stores it and attaches it to every future request.',
        },
        {
          from: 'app',
          to: 'gw',
          packet: 'GET /orders (JWT)',
          text: 'The client requests its orders. The gateway verifies the JWT signature and expiry locally — no database round trip — and checks the rate limit for this client.',
        },
        {
          from: 'gw',
          to: 'orders',
          packet: 'user 42 → /orders',
          text: 'Path /orders/* routes to the order service. The gateway forwards the request with the verified identity attached, so the service can trust "this is user 42".',
        },
        {
          from: 'orders',
          to: 'app',
          packet: '200 [orders]',
          text: 'The response flows back through the gateway (where it is logged and measured). One front door, many rooms.',
        },
      ],
    },
  },

  {
    id: 'microservices',
    title: 'Monoliths vs Microservices',
    summary: 'Splitting an app into services — and what an order really triggers.',
    blocks: [
      {
        type: 'p',
        text: 'A **monolith** is one deployable unit: one codebase, one database, one process. **Microservices** split the system into small, independently deployable services, each owning its own data.',
      },
      {
        type: 'list',
        items: [
          '**Monolith** — simple to start, easy local dev; but one bug can take down everything, and teams step on each other.',
          '**Microservices** — independent scaling and deploys per team; but you inherit network failures, distributed data and observability costs.',
          'Rule of thumb: **start monolith, extract services when team size or scaling demands it.**',
        ],
      },
      { type: 'h3', text: 'Sync vs async' },
      {
        type: 'p',
        text: 'Services talk **synchronously** (HTTP/gRPC — caller waits) or **asynchronously** via a **message queue** (SQS, Kafka — fire an event, consumers react later). Queues absorb traffic spikes and let services fail independently — see it on the board.',
      },
    ],
    flow: {
      title: 'Placing an order across microservices',
      w: 760,
      h: 420,
      nodes: [
        { id: 'client', x: 20, y: 175, icon: '🛒', label: 'Checkout UI' },
        { id: 'order', x: 230, y: 175, icon: '📦', label: 'Order service', sub: 'owns orders DB' },
        { id: 'pay', x: 460, y: 40, icon: '💳', label: 'Payment service', sub: 'sync call' },
        { id: 'inv', x: 460, y: 175, icon: '📊', label: 'Inventory service', sub: 'sync call' },
        { id: 'queue', x: 460, y: 310, icon: '📨', label: 'Message queue', sub: 'order.created' },
        { id: 'ship', x: 640, y: 310, icon: '🚚', label: 'Shipping service', sub: 'async consumer', w: 110 },
      ],
      edges: [
        { from: 'client', to: 'order', label: 'POST /orders' },
        { from: 'order', to: 'pay', label: 'charge' },
        { from: 'order', to: 'inv', label: 'reserve' },
        { from: 'order', to: 'queue', label: 'publish' },
        { from: 'queue', to: 'ship', label: 'consume' },
      ],
      steps: [
        {
          from: 'client',
          to: 'order',
          packet: 'POST /orders',
          text: 'The checkout calls the order service — the owner of the order lifecycle and the only service that writes to the orders database.',
        },
        {
          from: 'order',
          to: 'pay',
          packet: 'charge $49',
          text: 'Synchronous call #1: charge the card. The order service waits — it cannot confirm an unpaid order. Timeouts and retries must be designed for.',
        },
        {
          from: 'order',
          to: 'inv',
          packet: 'reserve SKU-7',
          text: 'Synchronous call #2: reserve stock. If this fails after payment succeeded, the order service must compensate (refund) — distributed transactions are the hard part of microservices.',
        },
        {
          from: 'order',
          to: 'queue',
          packet: 'event: order.created',
          text: 'Order confirmed. Instead of calling every interested service, it publishes one **event** to the queue and responds to the user immediately.',
        },
        {
          from: 'queue',
          to: 'ship',
          packet: 'order.created',
          text: 'The shipping service consumes the event at its own pace. If it is down for an hour, events wait in the queue — nothing is lost, checkout never noticed.',
        },
        {
          from: 'order',
          to: 'client',
          packet: '201 Created ✓',
          text: 'The user sees instant confirmation. Email, analytics and shipping all happen asynchronously off the same event — that decoupling is the payoff.',
        },
      ],
    },
  },

  {
    id: 'caching-redis',
    title: 'Caching & Redis',
    summary: 'Why a cache makes apps fast, and how the cache-aside pattern works with Redis.',
    blocks: [
      {
        type: 'p',
        text: 'A **cache** is a small, fast store that keeps copies of data you ask for often, so you can skip the slow work of recomputing or re-fetching it. The classic line: *"the two hard problems in computer science are cache invalidation, naming things, and off-by-one errors."*',
      },
      { type: 'h3', text: 'Why cache at all?' },
      {
        type: 'list',
        items: [
          '**Latency** — RAM is ~100,000× faster than disk. A cache hit returns in well under a millisecond; a database query can take tens of ms.',
          '**Database load** — reads are usually 10–100× more frequent than writes. Serving hot reads from cache keeps the database from melting under traffic.',
          '**Cost & scale** — one cache node can absorb the read load of many expensive database replicas.',
        ],
      },
      { type: 'h3', text: 'What is Redis?' },
      {
        type: 'p',
        text: '**Redis** is an in-memory **key–value** store — think a giant hash map living in RAM, reachable over the network in microseconds. It is more than a cache: it ships data structures like strings, hashes, **sorted sets** (great for leaderboards), lists (queues) and pub/sub.',
      },
      {
        type: 'code',
        text: "GET  product:42            # → (nil)  cache miss\nSET  product:42 \"{...}\" EX 300   # store JSON, expire in 300s\nGET  product:42            # → \"{...}\" cache HIT, <1ms",
      },
      { type: 'h3', text: 'Cache-aside (lazy loading)' },
      {
        type: 'p',
        text: 'The most common pattern: the app checks the cache first; on a **miss** it reads the database, then **writes the result back** into the cache with a **TTL** (time-to-live). The board shows a cold miss followed by a warm hit.',
      },
      {
        type: 'list',
        items: [
          '**Write strategies** — *write-through* (write cache + DB together, always fresh) vs *write-back* (write cache now, DB later, fast but riskier).',
          '**Eviction** — RAM is finite, so Redis drops keys when full using policies like **LRU** (least-recently-used) or **LFU**. A **TTL** also expires stale data.',
          '**Invalidation** — when the underlying data changes, delete or update the key, or you will serve stale results. This is the genuinely hard part.',
          '**More use cases** — session store, rate limiting (counters), leaderboards (sorted sets), job queues, and pub/sub messaging.',
        ],
      },
    ],
    flow: {
      title: 'Cache-aside: a miss, then a hit',
      w: 760,
      h: 320,
      nodes: [
        { id: 'client', x: 20, y: 130, icon: '📱', label: 'Client' },
        { id: 'api', x: 250, y: 130, icon: '⚙️', label: 'App server' },
        { id: 'redis', x: 500, y: 30, icon: '⚡', label: 'Redis cache', sub: 'in-memory' },
        { id: 'db', x: 500, y: 230, icon: '🗄️', label: 'Database', sub: 'source of truth' },
      ],
      edges: [
        { from: 'client', to: 'api', label: 'HTTP' },
        { from: 'api', to: 'redis', label: 'GET / SET' },
        { from: 'api', to: 'db', label: 'SQL' },
      ],
      steps: [
        { from: 'client', to: 'api', packet: 'GET /product/42', text: 'First request for product 42. The cache is cold — nothing is stored yet.' },
        { from: 'api', to: 'redis', packet: 'GET product:42', text: 'Cache-aside read: the app asks Redis first, before touching the database.' },
        { from: 'redis', to: 'api', packet: 'MISS (nil)', text: 'Cache MISS — the key is not present. The app must fall back to the source of truth.' },
        { from: 'api', to: 'db', packet: 'SELECT … id=42', text: 'The app queries the database for the product row.' },
        { from: 'db', to: 'api', packet: '1 row', text: 'The database returns the row — this is the slow path (tens of milliseconds).' },
        { from: 'api', to: 'redis', packet: 'SET product:42 EX 300', text: 'The app writes the result into Redis with a 300-second TTL, then responds. The cache is now warm.' },
        { from: 'api', to: 'client', packet: '200 OK', text: 'Client gets its answer. Slower this once — but the next reader benefits.' },
        { from: 'client', to: 'api', packet: 'GET /product/42', text: 'Seconds later, another user requests the same product.' },
        { from: 'api', to: 'redis', packet: 'GET product:42', text: 'Cache lookup again…' },
        { from: 'redis', to: 'api', packet: 'HIT ⚡ {json}', text: 'Cache HIT! Returned from RAM in under a millisecond — the database is never touched.' },
        { from: 'api', to: 'client', packet: '200 OK (cached)', text: 'A blazing-fast response, and the database load avoided entirely. That is the payoff of caching.' },
      ],
    },
  },
]
