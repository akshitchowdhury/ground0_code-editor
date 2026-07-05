# Ground Zer0 — Codebase Guide (a navigator, not a spec)

Read this first when you sit down to edit. It tells you **where things live, how they
fit together, and where to make a given change** — so you can dive in instead of feeling lost.

---

## 0. The 60-second mental model

Ground Zer0 is a **Vite + React (plain JSX, no TypeScript)** single-page app, styled with
**Tailwind v4**, icons from **lucide-react**, gated behind a login. It has three product areas:

1. **Code Sandbox** — a browser IDE for 6 languages (Project Mode + Guided tutorials).
2. **Ground0 : Cloud** — learning modules + an AI Exam Lab + **two visual design studios**
   (the *Architecture Studio* for cloud systems, and the *Agentic Studio* for LLM agents).
3. **Auth / shell** — login gate, navbar, landing.

**The single most important idea** (it explains the whole `cloud/` + `agent/` codebase):

> Every draggable block on a canvas is a **node** with an abstract **`kind`**
> (`compute`, `database`, `lb`, `agent`, `tool`, …). The *name/icon* is just a label;
> **all the logic — rules, simulation, load testing, cost — reasons purely off `kind` + `config`.**

That's why the same engine works for AWS/Azure/GCP (only labels change) and why the
rule engines are small, pure functions. Once you internalise "node = `{kind, config}`,
edge = `{from, to}`, and `lib/**` are pure `(nodes, edges) → result` functions, while
`pages/**` hold the React state," the codebase stops being scary.

```
node  = { id, type, kind, name, icon, x, y, config, ...extras }
edge  = { id, from, to, port?, label? }
lib/  = pure functions:  ({ nodes, edges }, opts) => { findings | steps | cost | ... }
pages/= React orchestrators: hold state, call lib/, render components/
data/ = the catalogs & templates (what blocks exist, starter designs)
```

### Run it
```bash
npm install
npm run dev          # Vite dev server (front end)
npm run goserver     # Go backend on :4100 (accounts, exams, AI, server-side studio analysis)
```
Vite proxies `/api/*` to the backend. The **code sandbox** runs fully offline. The **studios' canvas**
(drag/drop + instant connection legality) also works offline, but their **review/load/cost/AI panels
call the backend** now (see §6) — so `goserver` is no longer optional for the full studio/exam/auth experience.

---

## 1. Repo map (where everything is)

```
src/
  main.jsx                      App entry → BrowserRouter > AuthProvider > App
  App.jsx                       Auth gate + all routes (see §2)
  index.css                     Tailwind v4 + shared classes (.panel, .btn-*, animations)
  context/AuthContext.jsx       Custom Go-auth session (cookie) OR local guest account
  lib/
    storage.js                  localStorage wrapper (prefix "ground0.")
    api.js                      fail-soft client for the backend (auth + progress + exams)
    studioApi.js                client for the server-side studio endpoints (/api/studio/*)
    runners/                    ← CODE SANDBOX engines (see §5)
      jsRunner.js               JavaScript in a sandboxed iframe
      pythonRunner.js           Python via Pyodide (WASM)
      reactPreview.js           React/JSX → iframe via Babel Standalone
      remoteRunner.js           Go & Java via the Wandbox cloud API
      shell/interpreter.js      simulated bash (ShellSession)
      shell/virtualFs.js        virtual filesystem (localStorage)
    cloud/                      ← ARCHITECTURE STUDIO brain (see §3)
      rules.js                  connection legality + tier ordering   ★ rule engine
      analyze.js                well-architected review (findings/score) ★ rule engine
      simulate.js               request→response flow animation
      loadtest.js               capacity model + on-board load animation
      cost.js                   monthly cost estimate
      specs.js                  instance/DB price + capacity tables (tuning knobs)
    agent/                      ← AGENTIC STUDIO brain (see §4)
      rules.js                  connection legality (role allow-list)  ★ rule engine
      analyze.js                agent design review (findings/score)   ★ rule engine
      simulate.js               pipeline flow animation (lifecycle modes)
      profile.js                "training method → resulting agent" profile
  data/
    tracks.js                   6 sandbox languages + ACCENT colors
    defaultCode.js              starter code per language
    tutorials/*.js              Guided-Mode lessons per language
    cloud/
      modules.js                Cloud learning modules + exam catalog
      index.js                  getCloudLessons(moduleId)
      lessons/*.js              lesson content (networking, apis, databases, cloud, devops, ai)
      components.js             ★ Architecture Studio component catalog + multi-cloud
      templates.js              ★ Architecture Studio starter designs
      agentComponents.js        ★ Agentic Studio component catalog + models + blueprints
      agentTemplates.js         ★ Agentic Studio starter pipelines
  components/
    cloud/ArchitectureCanvas.jsx ★ the shared drag/drop SVG canvas (both studios)
    cloud/StudioPanels.jsx      Architecture Studio panels (palette/inspector/review/cost/load/compare)
    cloud/AgentPanels.jsx       Agentic Studio panels (palette/inspector/review/profile/blueprint)
    cloud/FindingFixIt.jsx      "Suggest a fix" expander on a review finding (AI, both studios)
    ErrorBoundary.jsx           wraps the canvas so a render error can't blank the page
    FlowBoard.jsx               read-only animated diagram engine for the *lessons*
    CodeWorkspace.jsx           ← code sandbox orchestrator (editor + runner + output)
    CodeEditor.jsx              Monaco editor wrapper
    ConsolePanel / Terminal / ReactPreviewFrame / SplitPane   IO + layout
    NetworkScene.jsx            login-screen 3D network animation (SVG + SMIL + CSS 3D)
    Watermark3D.jsx             landing-page 3D wordmark
    Navbar / LessonContent      (AuthModal was removed — the app is login-gated, so there's no modal)
  pages/
    Landing / Login
    Playground.jsx              Project Mode (free sandbox)
    LearnHome / TutorialPlayer  Guided Mode
    CloudHome / CloudTopicPlayer / ExamLab
    CloudDesigner.jsx           ★ Architecture Studio page (orchestrator)
    AgentStudio.jsx             ★ Agentic Studio page (orchestrator)
go-server/                     ← BACKEND (see §6), Go module
  cmd/server/main.go            entry point: wires config → db/cache → LLM client → all route groups
  internal/auth/                accounts, sessions, Google/GitHub OAuth, password reset
  internal/progress/            progress API + Postgres/in-memory store
  internal/exams/               exam API, catalog, offline bank, AI questions/feedback, study plan
  internal/studio/cloud/        server-side Architecture Studio engine (analyze/simulate/loadtest/cost/generate)
  internal/studio/agent/        server-side Agentic Studio engine (analyze/simulate/profile)
  internal/studio/fix/          AI "suggest a fix" endpoint (shared by both studios)
  internal/llm/                 provider-agnostic LLM client (Gemini → Groq → Anthropic)
  internal/cache/               Redis OR in-process KV cache (studio catalog, OAuth state, sessions)
  internal/db/migrations/       SQL schema (runs automatically on startup)
```
★ = the files you'll most often edit.

---

## 2. Routing & the shell (how pages connect)

`src/App.jsx` is the map. It's **real React Router now** (not a conditional render): a public
`/login` route plus a **`ProtectedLayout`** route (renders `<Navbar/>` + `<Outlet/>`) that wraps every
app route. `ProtectedLayout` redirects to `/login` when there's no `user` — passing the intended
location in router `state` so `Login` can send you back there after sign-in. `*` → `/`.

| Route | Page | Area | Access |
|---|---|---|---|
| `/login` | `Login` | Auth | **public** |
| `/` | `Landing` | marketing | protected |
| `/playground` | `Playground` | Code Sandbox (Project Mode) | protected |
| `/learn`, `/learn/:trackId` | `LearnHome`, `TutorialPlayer` | Code Sandbox (Guided) | protected |
| `/cloud` | `CloudHome` | Cloud hub | protected |
| `/cloud/:moduleId` | `CloudTopicPlayer` | Cloud lessons (FlowBoard) | protected |
| `/cloud/exam` | `ExamLab` | Exam Lab (uses backend) | protected |
| `/cloud/designer` | **`CloudDesigner`** | **Architecture Studio** | protected |
| `/cloud/agent-studio` | **`AgentStudio`** | **Agentic Studio** | protected |

Auth lives in `context/AuthContext.jsx`. Two kinds of user:
- **Real accounts** — email/password or Google/GitHub OAuth, hydrated from `GET /api/auth/me` via an
  HttpOnly session cookie. This is a **custom Go auth service** (§6) — **Firebase was removed**.
- **Guest** — a purely local account in `localStorage` (`ground0.demoUser`), no backend row; the app
  works fully offline with it. The Navbar shows a **"Guest" tag** to keep it visually separate.

`AuthProvider` shows a splash while it restores the session (`fetchMe`, falling back to a saved guest),
then flips `ready` so the router renders. **Server-side auth is real now** — the backend derives the
user from the session cookie and never trusts a client-supplied id (contrast the old Express behaviour).

---

## 3. Rule engine of the **Architecture Studio** (cloud design)

> "Which files are responsible for the rule engine of the design studio?"

There are **two** rule layers, both pure functions, plus supporting engines. They all read
the same node/edge graph.

> **Where they run now:** the heavy engines (`analyze`/`simulate`/`loadtest`/`cost`/`generate`) were
> ported to Go and the studio pages call them over `/api/studio/cloud/*` via `src/lib/studioApi.js`.
> The `src/lib/cloud/*.js` files below are the **canonical reference** (the Go port mirrors them
> line-for-line) and are still imported by the UI for **cheap/instant bits**: `rules.js` `classifyEdge`
> (connection legality — must be sub-frame, so it stays local), `simulate.js` `simulationTargets`, and
> styling/label constants (`FINDING_STYLES`, `CATEGORY_LABELS`) + `specs.js` dropdown tables. Edit a rule
> in **both** the JS file (reference/UI) and its Go twin (`go-server/internal/studio/cloud/`) to keep them in sync.

### 3a. The files (in priority order)

| File | Responsibility | Key exports |
|---|---|---|
| **`src/lib/cloud/rules.js`** | **Connection legality + tier ordering** — the *single source of truth* for "can A connect to B?". Enforces the request path `Web → Edge/Security → Load Balancer → Compute → Data`, blocks backwards/illegal wiring (e.g. Database→LB, Internet→DB, inbound-through-NAT). | `classifyEdge(from,to) → {ok, level:'ok'|'illegal', code, reason}`, `FLOW_RANK`, `STAGE_OF`, `PIPELINE_LANES`, `rankOf` |
| **`src/lib/cloud/analyze.js`** | **The "well-architected review"** — runs ~20 best-practice rules and produces the scored findings list. Calls `classifyEdge` for the wiring rule. Categories: Setup(correctness)/Security/IAM/Storage/Network/Reliability/Performance/Cost. | `analyzeArchitecture({nodes,edges}) → {findings[], securityScore, designScore, overall, verdict}`, `FINDING_STYLES`, `CATEGORY_LABELS` |
| `src/lib/cloud/simulate.js` | Animated **request→response** flow; each hop gets a verdict `ok`/`insecure`/`blocked` (also consults the same tier logic). Adds green "response back to user" legs. | `buildSimulation(...)`, `simulationTargets(nodes)` |
| `src/lib/cloud/loadtest.js` | **Capacity model** (find the bottleneck, success %, latency, fix recommendations) + **on-board load animation** (per-tier util colour, red overflow break). | `runLoadTest(...)`, `buildLoadFlow(...)` |
| `src/lib/cloud/cost.js` | Rough monthly **cost** per component + total. | `estimateCost(...)` |
| `src/lib/cloud/specs.js` | The **tuning tables**: instance/DB/cache capacity (rps/qps) + `$/hr`, request pricing, traffic presets. *Edit numbers here to retune the whole sim.* | `INSTANCE_TYPES`, `DB_CLASSES`, `PRICING`, `TRAFFIC_PRESETS`, helpers |
| `src/data/cloud/components.js` | The **catalog** (what blocks exist) + the kind groups the rules key off (`STATEFUL_KINDS`, `COMPUTE_KINDS`, `PUBLIC_ENTRY_KINDS`, `SENSITIVE_PORTS`) + multi-cloud labels. | `COMPONENT_CATALOG`, `getCatalog(provider)`, `getComponent`, `CLOUD_PROVIDERS`, `PROVIDER_LABELS`, `getProviderComparison` |

### 3b. How a rule actually runs (data flow)

```
CloudDesigner.jsx (state: nodes, edges)
   │  on connect (instant, LOCAL) → classifyEdge(...)          ... lib/cloud/rules.js
   │  debounced effect → analyzeCloud(nodes, edges)  ─┐
   │  debounced effect → costCloud(...)               │  studioApi.js → POST /api/studio/cloud/*
   │  on "Play"         → simulateCloud(...)           ├─▶ Go: internal/studio/cloud/*  (the live compute)
   │  on "Run/Play load"→ loadTestCloud/loadFlowCloud ─┘
   │  on "Generate"     → generateCloud(prompt)          ... AI (or template fallback)
   ▼
StudioPanels.jsx  (ReviewPanel renders findings, CostPanel, LoadTestPanel; FindingFixIt → POST /api/studio/fix)
ArchitectureCanvas.jsx (animates the steps; colours overloaded tiers red)
```
(The async calls are debounced ~200ms with a stale-response guard; on backend failure the panels keep
their last-good state. `classifyEdge` stays local so connection feedback is instant.)

### 3c. "I want to…" (Architecture Studio)
- **Add/change a best-practice rule** → `src/lib/cloud/analyze.js` (copy an existing `add(level, category, title, detail, nodeIds)` block).
- **Change what can connect to what** → `src/lib/cloud/rules.js` (`classifyEdge` + `FLOW_RANK`/`STAGE`).
- **Add a new cloud component** → `src/data/cloud/components.js` (add to `COMPONENT_CATALOG` with a `kind` the engines already understand; if it's a *new* kind, teach `analyze`/`simulate`/`loadtest`/`cost` about it).
- **Retune capacity/cost numbers** → `src/lib/cloud/specs.js`.
- **Add a starter design** → `src/data/cloud/templates.js`.
- **Add an Azure/GCP name or comparison note** → `PROVIDER_LABELS` / `PROVIDER_COMPARE` in `components.js`.

---

## 4. Rule engine of the **Agentic Studio** (AI design)

> "Components/files responsible for the rule engine of the AI design studio."

Same two-layer shape as the cloud studio, but the domain is LLM-agent pipelines.

| File | Responsibility | Key exports |
|---|---|---|
| **`src/lib/agent/rules.js`** | **Connection legality** for agent graphs. Agent graphs are hub-and-spoke (the model in the centre), so instead of tier-ranking it uses a **role-based allow-list** (`ALLOWED_TARGETS[fromKind] → [allowed toKinds]`). Catches classic mistakes: Knowledge→Agent (skipping RAG), Tool→Response, wiring into the User entry. | `classifyAgentEdge(from,to)`, `ALLOWED_TARGETS`, `ROLE`, `BUILD_STEPS` |
| **`src/lib/agent/analyze.js`** | **Agent design review.** Rules: invalid wiring (uses `classifyAgentEdge`), unbounded agent loop, side-effecting tool with no human-in-the-loop, no guardrails, unsandboxed code, incomplete RAG, fine-tuning misused for knowledge, too-few/unlabeled fine-tune data, no eval/observability/prompt, blueprint requirements. | `analyzeAgent({nodes,edges,blueprintId}) → {findings[], correctnessScore, safetyScore, designScore, overall, verdict}`, `CATEGORY_LABELS`, `FINDING_STYLES` (re-exported from cloud `analyze`) |
| `src/lib/agent/simulate.js` | Animated pipeline flow with **stage colours** (cyan request / violet RAG / emerald ops) and **modes** (`lifecycle`/`request`/`ingestion`). Consults `classifyAgentEdge` for blocked hops. | `simulateAgent(...)`, `STAGE_COLORS`, `FLOW_MODES` |
| `src/lib/agent/profile.js` | The **"training principles → resulting agent"** view: from the graph, derive the archetype + customization method (prompting/RAG/fine-tune/RLHF) + capabilities/effort/cost. | `buildProfile({nodes})` |
| `src/data/cloud/agentComponents.js` | The **agent catalog** + the model table + blueprints (agent types). | `AGENT_CATALOG`, `MODELS`, `AGENT_BLUEPRINTS`, `getBlueprint`, `getAgentComponent`, `AGENT_PATTERNS` |
| `src/data/cloud/agentTemplates.js` | Starter pipelines per blueprint + the `risky-draft` demo. | `AGENT_TEMPLATES`, `buildAgentTemplate` |
| `src/pages/AgentStudio.jsx` | Orchestrator (state, blueprint picker, run, tabs). | — |
| `src/components/cloud/AgentPanels.jsx` | Palette, NodeInspector, ReviewPanel, ProfilePanel, BlueprintPicker, `agentNodeMeta`. | — |

**Data flow** mirrors §3b (and the same "runs on the server now" note applies): `AgentStudio.jsx`
holds `{nodes, edges, blueprintId}`, calls `analyzeAgent` + `profileAgent` + `simulateAgent` over
`/api/studio/agent/*` via `studioApi.js` (Go: `internal/studio/agent/`), keeps `classifyAgentEdge`
local for instant connect-time validation, and renders via `AgentPanels.jsx` (with `FindingFixIt`)
over the shared `ArchitectureCanvas.jsx`. The `src/lib/agent/*.js` files remain the reference twins.

### "I want to…" (Agentic Studio)
- **Add an agent rule** → `src/lib/agent/analyze.js`.
- **Change valid wiring** → `src/lib/agent/rules.js` (`ALLOWED_TARGETS`).
- **Add an agent block / model / blueprint** → `src/data/cloud/agentComponents.js`.
- **Add a starter pipeline** → `src/data/cloud/agentTemplates.js`.

---

## 5. The "Excalidraw-like" canvas — what library?

**None.** There is **no Excalidraw, no react-flow, no diagram library.** The drag-and-drop
canvas is **hand-built** in:

- **`src/components/cloud/ArchitectureCanvas.jsx`** — the one canvas shared by *both* studios.
  - **Nodes** = absolutely-positioned HTML `<div>`s (easy to style with Tailwind).
  - **Edges, arrowheads, the moving "packet", the red ✕, util badges** = an SVG layer behind the nodes.
  - **Drag** = pointer events with a click-vs-drag threshold (so a click selects, a drag moves).
  - **Drop from palette** = native HTML5 drag-and-drop (`dataTransfer`).
  - **Connect** = a mode where you click source then target.
  - **Animation** = a `dt`-based `setInterval` (deliberately **not** `requestAnimationFrame` — rAF never fires in the hidden preview pane; see the project memory).
  - It's **controlled & generic**: the page passes `nodes/edges/selected/sim/...` and callbacks; props like `renderNodeMeta` and `nodeStatus` let the two studios reuse it.

Libraries actually involved in the UI: **React 18, react-router-dom, Tailwind v4, lucide-react,
and plain SVG**. If you want a more Excalidraw-like feel (rough edges, free-draw), this single
~300-line file is where you'd do it.

Two other custom animation files (also no library): **`FlowBoard.jsx`** (the read-only animated
diagrams in the Cloud *lessons*), **`NetworkScene.jsx`** (login-screen 3D network, via SVG SMIL +
CSS 3D transforms), and **`Watermark3D.jsx`** (landing wordmark).

---

## 6. Backend — what's integrated, what's missing

The backend is a **Go** app (`go-server/`, `npm run goserver` or `cd go-server && go run ./cmd/server`,
port 4100; Vite proxies `/api` here). It started as a from-scratch port of the original Express server
(same routes/JSON shapes) and grew through three phases into the full backend: **Phase 1** progress +
exams, **Phase 2** the design-studio engines + caching, **Phase 3** custom auth. On top of that sits the
shared **LLM client** and the AI features. The old Express server (`server/`, `npm run server`, port 4000)
is kept for rollback only — nothing proxies to it; it's safe to delete once the Go backend has soaked.

`cmd/server/main.go` wires everything: `config.Load()` → Postgres pool (or nil → in-memory stores) →
Redis (or in-process cache) → one shared `llm.Client` → then mounts every route group on a chi router
with `authSvc.WithUser` resolving the session cookie on each request.

| Package | What it does | Routes |
|---|---|---|
| `internal/auth/` | **Custom auth** — bcrypt passwords, opaque SHA-256 session tokens (HttpOnly cookie), Google/GitHub OAuth (`x/oauth2`, CSRF state in the KV cache), single-use password-reset tokens, Resend-or-console mailer. `WithUser`/`RequireUser` middleware. | `/api/auth/{register,login,logout,me,providers}`, `/api/auth/password/{forgot,reset}`, `/api/auth/oauth/{provider}/{start,callback}` |
| `internal/progress/` | Lesson progress. **Postgres** when `DATABASE_URL` is reachable, else automatic **in-memory** fallback. `RequireUser` — the user comes from the session, never the client. | `GET/PUT /api/progress` |
| `internal/exams/` | Exam catalog + **offline question bank** + AI question generation, grading, feedback, and the **adaptive study plan** (re-grades stored attempts to find weak domains). | `POST /api/exams`, `POST /api/exams/{id}/submit`, `GET /api/exams`, `GET /api/exams/studyplan` |
| `internal/studio/cloud/` | **Server-side Architecture Studio engine** — the Go twin of `src/lib/cloud/*` (analyze/simulate/loadtest/cost) plus NL→design `generate`. Catalog/specs read through the cache. | `POST /api/studio/cloud/{analyze,simulate,loadtest,loadflow,cost,generate}`, `GET /api/studio/cloud/specs` |
| `internal/studio/agent/` | **Server-side Agentic Studio engine** — Go twin of `src/lib/agent/*` (analyze/simulate/profile). | `POST /api/studio/agent/{analyze,simulate,profile}`, `GET /api/studio/agent/specs` |
| `internal/studio/fix/` | AI **"suggest a fix"** for a review finding (curated static library fallback). Shared by both studios. | `POST /api/studio/fix` |
| `internal/llm/` | Provider-agnostic JSON LLM client with a **free-first chain: Gemini → Groq → Anthropic**. `nil` when no keys are set, so every caller falls back to its offline path. | — |
| `internal/cache/` | A `KV` interface backed by **Redis** or an **in-process** map (catalog/specs, OAuth state, session cache). | — |
| `internal/db/migrations/` | SQL schema (progress/exams, studio catalog, auth tables, uuid backfill) — runs automatically on boot, idempotent DDL. | — |

Front-end clients: `src/lib/api.js` (fail-soft — progress is localStorage-first with fire-and-forget
sync; auth/exams surface errors) and `src/lib/studioApi.js` (studio endpoints — **not** fail-soft, since
their result *is* the panel content; callers keep last-good state on failure).

### ✅ Integrated & working
- **Real auth**: email/password + Google/GitHub OAuth + guest, session cookies, password reset. Progress
  and exam history are access-controlled by the session (guests get local-only / empty history).
- **Exam Lab** end-to-end (AI or offline): start → grade → feedback → history → adaptive study plan.
- **Both design studios compute on the server** (analyze/simulate/loadtest/cost/profile), plus the three
  AI features (NL→architecture, fix suggestions, study plan) — each LLM-first with an offline fallback.
- **Graceful degradation everywhere**: no DB → in-memory; no Redis → in-process cache; no AI keys →
  offline bank / heuristics / templates; studio backend down → panels keep last-good state.

### 🔲 Not integrated / TODO
- **Design *storage* is still localStorage-only** (`cloudDesigns`, `cloudActiveDesign`, `agentDesign`) —
  the server *computes* on a design you POST, but doesn't yet save/share it per account. *TODO if wanted.*
- **The code sandbox never touches the backend** — code runs in the browser (Go/Java on external Wandbox).
- **No tests / CI** — verification has been manual + scripted.
- It's a **learning simulator** — no real cloud provisioning / Terraform export.
- **Redis isn't set up on the dev machine** (Docker was unreliable here) — caching uses the in-process
  fallback, which is fine for single-instance dev but doesn't survive a restart or span instances.

---

## 7. The Code Sandbox engine

> "Code sandbox engine files, working functions and components."

**Orchestrator:** `src/components/CodeWorkspace.jsx` — given `{ language, code, onCodeChange }`,
it shows the Monaco editor + a **Run** button that dispatches to the right runner, and lays out
the output per language (js/python → *editor | console*; react → *editor | preview + console*;
shell → *terminal | editor*). Used by **`Playground.jsx`** (Project Mode) and **`TutorialPlayer.jsx`** (Guided).

**Runners** (`src/lib/runners/`) — each is a small module with one entry function:

| File | Entry fn | How it works |
|---|---|---|
| `jsRunner.js` | `runJavaScript(code, {onOutput, onDone})` | Fresh **sandboxed hidden iframe** per run; `console.*` + errors stream back via `postMessage`; program wrapped in an async IIFE (top-level `await` works); 15s safety timeout. |
| `pythonRunner.js` | `runPython(code, {onOutput, onStatus})` | **Pyodide** (CPython on WebAssembly), lazy-loaded ~10 MB from CDN and cached; fresh global namespace per run; trims Pyodide frames from tracebacks. `isPythonReady()`. |
| `reactPreview.js` | `buildReactSrcDoc(source) → {error, srcdoc}` | Transpiles JSX with **Babel Standalone** (lazy ~2 MB) in the parent, strips ES imports, builds an iframe `srcdoc` with React UMD, auto-renders `export default`/`App`, streams console. |
| `remoteRunner.js` | `runRemote(language, code, {onOutput, onStatus})` | **Go 1.23 & Java JDK 22** compiled/run on the free **Wandbox** cloud API; one retry on transient container errors; 60s timeout. (Note: Java entry class must be `class Main` without `public`.) |
| `shell/interpreter.js` | `new ShellSession()` | A **simulated bash** interpreter: variables, quoting, pipes, `>`/`>>`, comments, ~30 commands. |
| `shell/virtualFs.js` | — | The **virtual filesystem** the shell operates on, persisted to localStorage. |

**IO / layout components:** `CodeEditor.jsx` (Monaco), `ConsolePanel.jsx` (console output),
`ReactPreviewFrame.jsx` (the React iframe), `Terminal.jsx` (shell UI), `SplitPane.jsx` (resizable split).

**Supporting data:** `data/tracks.js` (the 6 languages + accent colors), `data/defaultCode.js`
(starter snippets), `data/tutorials/*.js` (Guided-Mode lessons — append a level object to add a lesson).

**Flow:** `Playground/TutorialPlayer` → `CodeWorkspace` → (runner) → `ConsolePanel`/`ReactPreviewFrame`/`Terminal`.

---

## 8. Cross-cutting things worth knowing

- **State vs logic split.** If you're changing *layout/interaction*, you're in `src/pages/**` or
  `src/components/**`. If you're changing *behaviour/rules*, the pure logic lives in `src/lib/**` — but
  note the studio engines now **run on the server**, so a rule change means editing the `src/lib/{cloud,agent}/*.js`
  reference **and** its Go twin in `go-server/internal/studio/*` (§3). The `data/**` files are just
  catalogs — edit them to add blocks/lessons/templates (no backend change needed).
- **Persistence** is all `localStorage` via `src/lib/storage.js` (keys are prefixed `ground0.`):
  `cloudDesigns`/`cloudActiveDesign` (Architecture Studio), `agentDesign` (Agentic Studio),
  `cloudProgress`, `demoUser`, playground code, etc.
- **Styling** = Tailwind v4 utility classes + a few shared component classes in `index.css`
  (`.panel`, `.panel-header`, `.btn-primary/-ghost/-outline`, `.gradient-text`). Accent palettes
  live in `data/tracks.js` (`ACCENTS`). *Tailwind v4 gotcha: you can't `@apply` a custom class.*
- **The canvas animation uses `setInterval` on purpose** (not rAF) — don't "fix" it.
- **`ErrorBoundary.jsx`** wraps each studio's canvas so a render error shows a recoverable
  fallback instead of a blank page.

---

## 9. TL;DR cheat-sheet

| I want to change… | Go to |
|---|---|
| A cloud **best-practice rule / warning** | `src/lib/cloud/analyze.js` |
| **What can connect to what** (cloud) | `src/lib/cloud/rules.js` |
| An **agent** rule | `src/lib/agent/analyze.js` |
| **What can connect to what** (agent) | `src/lib/agent/rules.js` |
| Capacity / cost **numbers** | `src/lib/cloud/specs.js` (+ `cost.js`, `loadtest.js`) |
| Add a **cloud component** | `src/data/cloud/components.js` |
| Add an **agent component / model / blueprint** | `src/data/cloud/agentComponents.js` |
| Add a **starter design / pipeline** | `templates.js` / `agentTemplates.js` |
| The **canvas / drag-drop / animation** | `src/components/cloud/ArchitectureCanvas.jsx` |
| Studio **panels / inspectors** | `StudioPanels.jsx` / `AgentPanels.jsx` |
| Studio **page wiring / state / tabs** | `pages/CloudDesigner.jsx` / `pages/AgentStudio.jsx` |
| A **code runner** | `src/lib/runners/*` |
| The **live studio compute** (analyze/sim/load/cost) | `go-server/internal/studio/*` (+ mirror the `src/lib/**` twin) |
| **Auth / accounts / OAuth** (server) | `go-server/internal/auth/*` |
| The **backend API / exams / DB** | `go-server/internal/*` |
| **Studio API client** (front end) | `src/lib/studioApi.js` |
| **Routes / protected layout / auth gate** | `src/App.jsx`, `context/AuthContext.jsx` |
| A **lesson** (cloud or language) | `src/data/cloud/lessons/*` / `src/data/tutorials/*` |
