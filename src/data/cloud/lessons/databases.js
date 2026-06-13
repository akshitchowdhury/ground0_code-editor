// Databases & Data Modeling — lessons with interactive flow boards / cards.
// Block format matches src/data/tutorials (LessonContent renders it).

export default [
  {
    id: 'sql-vs-nosql',
    title: 'SQL vs NoSQL',
    summary: 'Relational tables vs the NoSQL families — and when each one fits.',
    blocks: [
      {
        type: 'p',
        text: 'Every database makes trade-offs. **SQL (relational)** databases store data in **tables** with a fixed **schema** and let you combine them with **joins**. **NoSQL** is an umbrella for everything else — built for flexibility or massive scale, usually by giving something up.',
      },
      { type: 'h3', text: 'Relational (SQL)' },
      {
        type: 'list',
        items: [
          '**Schema-on-write** — you define columns and types up front; the database enforces them.',
          '**Joins** let you keep data **normalized** (no duplication) and combine it at query time.',
          '**ACID transactions** make multi-step changes all-or-nothing — vital for money, orders, inventory.',
          'Examples: **PostgreSQL, MySQL**. Default choice until you have a concrete reason to leave.',
        ],
      },
      { type: 'h3', text: 'The NoSQL families' },
      {
        type: 'list',
        items: [
          '**Document** (MongoDB) — JSON-like documents; flexible, evolving schemas; data nested instead of joined.',
          '**Key–value** (Redis, DynamoDB) — a giant map; blazing fast lookups by key; minimal query power.',
          '**Wide-column** (Cassandra, Bigtable) — huge write throughput across many machines; great for time-series.',
          '**Graph** (Neo4j) — nodes and edges; makes "friends-of-friends" and recommendations cheap.',
        ],
      },
      {
        type: 'p',
        text: 'NoSQL often **denormalizes** — storing data the way you read it (even duplicating it) to avoid joins and scale horizontally. The cost is keeping those copies in sync. See the families side by side on the board.',
      },
    ],
    cards: {
      title: 'Pick the model that matches your data',
      items: [
        { icon: '🧮', title: 'Relational · SQL', text: 'Tables, joins, ACID. Strong consistency and rich queries. Postgres / MySQL. The safe default.' },
        { icon: '📄', title: 'Document', text: 'Nested JSON documents, flexible schema. Great for content, catalogs, user profiles. MongoDB.' },
        { icon: '⚡', title: 'Key–value', text: 'Get/set by key, microsecond latency. Caching, sessions, feature flags. Redis / DynamoDB.' },
        { icon: '🧱', title: 'Wide-column', text: 'Billions of rows, write-heavy, linear scale. Time-series, event logs. Cassandra / Bigtable.' },
        { icon: '🕸️', title: 'Graph', text: 'Nodes + relationships. Social graphs, recommendations, fraud rings. Neo4j.' },
        { icon: '🔎', title: 'Search', text: 'Inverted index for full-text & relevance ranking. Logs and search bars. Elasticsearch / OpenSearch.' },
      ],
    },
  },

  {
    id: 'acid-cap',
    title: 'ACID, BASE & the CAP theorem',
    summary: 'Consistency guarantees, and the trade-off every distributed database must make.',
    blocks: [
      {
        type: 'p',
        text: '**ACID** describes the guarantees of a classic transaction: **A**tomic (all-or-nothing), **C**onsistent (rules never violated), **I**solated (concurrent transactions don’t corrupt each other), **D**urable (once committed, it survives a crash).',
      },
      {
        type: 'p',
        text: 'Many NoSQL systems instead offer **BASE** — **B**asically **A**vailable, **S**oft state, **E**ventually consistent. They stay up and fast, accepting that replicas may briefly disagree before converging.',
      },
      { type: 'h3', text: 'The CAP theorem' },
      {
        type: 'list',
        items: [
          '**C**onsistency — every read sees the latest write.',
          '**A**vailability — every request gets a (non-error) response.',
          '**P**artition tolerance — the system keeps working when the network between nodes breaks.',
          'In a distributed system **partitions will happen**, so you really choose **C vs A** *during* a partition.',
        ],
      },
      {
        type: 'p',
        text: '**CP** systems (e.g. a single-leader SQL DB) refuse or block to stay correct. **AP** systems (Dynamo, Cassandra — tunable) keep answering with possibly-stale data. Play the board to feel the trade-off.',
      },
    ],
    flow: {
      title: 'A network partition forces a choice',
      w: 720,
      h: 340,
      nodes: [
        { id: 'app', x: 20, y: 140, icon: '📱', label: 'App' },
        { id: 'a', x: 250, y: 30, icon: '🗄️', label: 'Node A', sub: 'primary' },
        { id: 'b', x: 250, y: 250, icon: '🗄️', label: 'Node B', sub: 'replica' },
        { id: 'reader', x: 500, y: 250, icon: '👤', label: 'Reader' },
      ],
      edges: [
        { from: 'app', to: 'a', label: 'write' },
        { from: 'a', to: 'b', dashed: true, label: 'replicate' },
        { from: 'reader', to: 'b', label: 'read' },
      ],
      steps: [
        { from: 'app', to: 'a', packet: 'write x = 1', text: 'The app writes x = 1 to node A.' },
        { from: 'a', to: 'b', packet: 'replicate x = 1', text: 'Node A copies the change to node B. Both agree.' },
        { from: 'reader', to: 'b', packet: 'read x → 1', text: 'A reader queries node B and sees x = 1. Everything is consistent and available.' },
        { from: 'a', to: 'b', packet: '✂ partition!', danger: true, text: 'Now the network link between A and B breaks — a partition. In any real distributed system, this is a "when", not an "if".' },
        { from: 'app', to: 'a', packet: 'write x = 2', text: 'A fresh write sets x = 2 on node A — but A can no longer reach B.' },
        { from: 'reader', to: 'b', packet: 'read x → ?', danger: true, text: 'The reader hits B. The system must choose: CP → return an error/block to stay correct, or AP → return the stale x = 1 to stay available. CAP says you cannot have both while partitioned.' },
      ],
    },
  },

  {
    id: 'indexes',
    title: 'Indexes: finding data fast',
    summary: 'Why a query on a million rows can be instant — or crawl.',
    blocks: [
      {
        type: 'p',
        text: 'An **index** is a separate, sorted data structure that lets the database jump straight to the rows you want instead of reading the whole table. It is the single biggest lever on query performance.',
      },
      { type: 'h3', text: 'Scan vs lookup' },
      {
        type: 'list',
        items: [
          'No index → **full table scan**: read every row to find matches. **O(n)** — fine at 1,000 rows, brutal at 10,000,000.',
          'With a **B-tree index** → ~log₂(n) comparisons. **O(log n)** — a million rows is found in ~20 steps.',
          'The **primary key** is indexed automatically; add **secondary indexes** on columns you filter, sort or join on.',
          'A **composite index** on `(tenant_id, created_at)` serves queries that filter by tenant and sort by time.',
        ],
      },
      { type: 'h3', text: 'The catch' },
      {
        type: 'p',
        text: 'Indexes are not free: every **write** must also update every index, and each index costs storage. Index the columns your queries actually use — not all of them. Use `EXPLAIN ANALYZE` to see whether a query hits an index or scans.',
      },
    ],
    flow: {
      title: 'The same query, with and without an index',
      w: 760,
      h: 320,
      nodes: [
        { id: 'app', x: 20, y: 130, icon: '⚙️', label: 'App' },
        { id: 'db', x: 240, y: 130, icon: '🗄️', label: 'Database' },
        { id: 'idx', x: 500, y: 30, icon: '🌲', label: 'B-tree index', sub: 'sorted by email' },
        { id: 'heap', x: 500, y: 230, icon: '📚', label: 'Table', sub: '1,000,000 rows' },
      ],
      edges: [
        { from: 'app', to: 'db', label: 'query' },
        { from: 'db', to: 'idx', label: 'lookup' },
        { from: 'db', to: 'heap', label: 'scan / fetch' },
      ],
      steps: [
        { from: 'app', to: 'db', packet: 'WHERE email = ?', text: 'The app runs SELECT … WHERE email = ? on a 1,000,000-row table.' },
        { from: 'db', to: 'heap', packet: 'read every row', danger: true, text: 'With no index, the database does a full table scan — checking all 1,000,000 rows. O(n).' },
        { from: 'heap', to: 'db', packet: '1 match (slow)', text: 'It eventually finds the match, after reading everything. Acceptable at small scale; a disaster at large scale.' },
        { from: 'app', to: 'db', packet: 'same query, indexed', text: 'Now add an index on the email column and run the identical query.' },
        { from: 'db', to: 'idx', packet: '~20 comparisons', text: 'A B-tree index is sorted, so the database narrows to the key in about log₂(1,000,000) ≈ 20 steps. O(log n).' },
        { from: 'idx', to: 'heap', packet: 'pointer → row', text: 'The index entry points directly at the row’s location on disk.' },
        { from: 'heap', to: 'app', packet: '1 row (instant)', text: 'One row fetched directly — often 100–1000× faster. Index what you query; remember writes pay the cost.' },
      ],
    },
  },

  {
    id: 'replication',
    title: 'Replication & read replicas',
    summary: 'Copying data across machines for read scale and high availability.',
    blocks: [
      {
        type: 'p',
        text: '**Replication** keeps copies of your data on multiple machines. The common shape is **leader–follower**: one **primary** takes all writes and streams its change log to **replicas** that serve reads.',
      },
      { type: 'h3', text: 'What it buys you' },
      {
        type: 'list',
        items: [
          '**Read scaling** — most apps read far more than they write. Add replicas to multiply read capacity.',
          '**High availability** — if the primary dies, a replica is **promoted** (failover) so the system stays up.',
          '**Geo-locality** — put replicas near users to cut read latency; some setups replicate across regions.',
        ],
      },
      { type: 'h3', text: 'The gotcha: replication lag' },
      {
        type: 'p',
        text: 'Replication is usually **asynchronous**, so replicas can be milliseconds — occasionally seconds — behind the primary. A user who just wrote data might read a replica and not see it (**read-your-writes** problem). Fixes: read those queries from the primary, or use synchronous replication (slower writes). Replication adds **read** capacity and resilience — but **not** more write capacity. For that, see sharding.',
      },
    ],
    flow: {
      title: 'Writes to the primary, reads from replicas',
      w: 780,
      h: 360,
      nodes: [
        { id: 'writer', x: 20, y: 40, icon: '✍️', label: 'App · writes' },
        { id: 'reader', x: 20, y: 260, icon: '👀', label: 'App · reads' },
        { id: 'primary', x: 250, y: 150, icon: '🗄️', label: 'Primary', sub: 'all writes' },
        { id: 'r1', x: 520, y: 30, icon: '📁', label: 'Replica 1' },
        { id: 'r2', x: 520, y: 150, icon: '📁', label: 'Replica 2' },
        { id: 'r3', x: 520, y: 270, icon: '📁', label: 'Replica 3' },
      ],
      edges: [
        { from: 'writer', to: 'primary', label: 'write' },
        { from: 'primary', to: 'r1', dashed: true, label: 'replicate' },
        { from: 'primary', to: 'r2', dashed: true },
        { from: 'primary', to: 'r3', dashed: true },
        { from: 'reader', to: 'r1', label: 'read' },
        { from: 'reader', to: 'r3', label: 'read' },
      ],
      steps: [
        { from: 'writer', to: 'primary', packet: 'INSERT / UPDATE', text: 'All writes go to the single primary — one source of truth keeps writes ordered and consistent.' },
        { from: 'primary', to: 'r1', packet: 'change log', text: 'The primary streams its write-ahead log to the replicas, usually asynchronously.' },
        { from: 'primary', to: 'r3', packet: 'change log', text: 'Each replica replays the same changes, becoming a near-identical copy of the primary.' },
        { from: 'reader', to: 'r1', packet: 'SELECT …', text: 'Reads fan out across replicas. Add more replicas → scale read throughput almost linearly.' },
        { from: 'reader', to: 'r3', packet: 'SELECT …', text: 'Different readers hit different replicas, freeing the primary to focus on writes.' },
        { from: 'primary', to: 'r2', packet: 'lag: 200ms', danger: true, text: 'Replication lag: a replica can trail the primary. Need to read your own just-written data? Read it from the primary.' },
        { from: 'primary', to: 'primary', packet: '⚠ failover', danger: true, text: 'If the primary fails, a replica is promoted to primary. The app reconnects and writes continue — that is high availability.' },
      ],
    },
  },

  {
    id: 'sharding',
    title: 'Sharding: scaling writes',
    summary: 'Splitting one dataset across many databases when a single one is not enough.',
    blocks: [
      {
        type: 'p',
        text: 'Replication scales reads, but every write still hits one primary, and one machine can only hold so much data. **Sharding** (horizontal partitioning) splits the dataset across many independent databases — each **shard** owns a slice of the rows.',
      },
      { type: 'h3', text: 'Routing by shard key' },
      {
        type: 'list',
        items: [
          'A **shard key** (e.g. `user_id`) decides which shard a row lives on, via **hash** or **range**.',
          'Pick a key with **high cardinality** and **even distribution** so load spreads — a bad key creates **hotspots** (the "celebrity problem").',
          '**Hash sharding** spreads evenly but kills range scans; **range sharding** keeps ranges together but can hotspot.',
        ],
      },
      { type: 'h3', text: 'The costs' },
      {
        type: 'p',
        text: '**Cross-shard queries** (e.g. "count all users") must fan out to every shard and merge — slow and complex. **Cross-shard transactions** are hard. And re-sharding moves data; **consistent hashing** minimizes how much. Rule of thumb: replicate first, shard only when one node truly cannot keep up.',
      },
    ],
    flow: {
      title: 'A shard router spreads writes',
      w: 760,
      h: 360,
      nodes: [
        { id: 'app', x: 20, y: 150, icon: '⚙️', label: 'App' },
        { id: 'router', x: 250, y: 150, icon: '🔀', label: 'Shard router', sub: 'hash(user_id)' },
        { id: 's1', x: 500, y: 30, icon: '🗄️', label: 'Shard A', sub: 'keys 0–33%' },
        { id: 's2', x: 500, y: 150, icon: '🗄️', label: 'Shard B', sub: 'keys 34–66%' },
        { id: 's3', x: 500, y: 270, icon: '🗄️', label: 'Shard C', sub: 'keys 67–100%' },
      ],
      edges: [
        { from: 'app', to: 'router' },
        { from: 'router', to: 's1' },
        { from: 'router', to: 's2' },
        { from: 'router', to: 's3' },
      ],
      steps: [
        { from: 'app', to: 'router', packet: 'write user 8675309', text: 'A single database cannot hold or write all the data, so we split it horizontally into shards.' },
        { from: 'router', to: 's2', packet: 'hash % 3 = 1 → B', text: 'hash(8675309) routes to Shard B. Each shard is an independent database holding just its slice of the rows.' },
        { from: 'app', to: 'router', packet: 'write user 12', text: 'Another user arrives…' },
        { from: 'router', to: 's1', packet: '→ Shard A', text: '…and routes to Shard A. Writes now run in parallel across shards — that is how you scale writes past one machine.' },
        { from: 'router', to: 's3', packet: 'report: ALL users', danger: true, text: 'A query spanning shards must fan out to every shard and merge results — expensive. Choose a shard key that matches your most common access pattern.' },
        { from: 'router', to: 'router', packet: '+ add Shard D', text: 'Growing the cluster remaps keys. Consistent hashing keeps most keys put, so only a fraction of the data moves.' },
      ],
    },
  },

  {
    id: 'choosing-a-database',
    title: 'Choosing the right database',
    summary: 'Match the database to your access pattern — most real systems use several.',
    blocks: [
      {
        type: 'p',
        text: 'There is no single best database — only the best fit for a given job. The decision is driven by your **access pattern** (how you read and write), your **consistency** needs, your **scale**, and the **shape** of your queries.',
      },
      { type: 'h3', text: 'Questions to ask' },
      {
        type: 'list',
        items: [
          '**Read or write heavy?** And what scale — thousands or billions of rows?',
          '**Do you need transactions / strong consistency** (money, inventory) or is eventual consistency fine?',
          '**What do queries look like** — key lookups, complex joins, full-text search, graph traversals, analytics?',
          '**How fixed is the schema** — stable and relational, or rapidly evolving?',
        ],
      },
      {
        type: 'p',
        text: 'Real systems practice **polyglot persistence**: Postgres for orders, Redis for sessions, Elasticsearch for search, S3 for files, a warehouse for analytics. Start relational; add specialized stores when a clear need appears.',
      },
    ],
    cards: {
      title: 'Use case → database',
      items: [
        { icon: '🧮', title: 'Transactions & relations', text: 'Orders, payments, anything needing ACID and joins → PostgreSQL / MySQL.' },
        { icon: '⚡', title: 'Ultra-low-latency lookups', text: 'Sessions, caches, rate limits, feature flags → Redis / DynamoDB.' },
        { icon: '📄', title: 'Flexible / evolving schema', text: 'Content, catalogs, user profiles with nested data → MongoDB.' },
        { icon: '🧱', title: 'Massive write throughput', text: 'Event logs, IoT, time-series at huge scale → Cassandra / Bigtable.' },
        { icon: '🕸️', title: 'Relationship-heavy queries', text: 'Social graphs, recommendations, fraud detection → Neo4j.' },
        { icon: '🔎', title: 'Full-text search & relevance', text: 'Search bars, log analytics → Elasticsearch / OpenSearch.' },
        { icon: '🪣', title: 'Large files & blobs', text: 'Images, video, backups, data lakes → S3 / object storage.' },
        { icon: '📈', title: 'Metrics & analytics', text: 'Dashboards, OLAP, BI → Snowflake / BigQuery / Redshift; Timescale / Influx for metrics.' },
      ],
    },
  },
]
