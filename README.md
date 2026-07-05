# DevAshura FΦrge (D.A.F)

A browser-based learning workspace that mixes a real multi-language code sandbox with two visual **design studios** — one for cloud architecture, one for LLM agents — plus an AI-graded exam lab. Everything runs in the browser; a Go backend adds accounts, persistence, and the AI features on top.

I started this as an MVP (then called *Ground Zer0*) to have one place where I could *write code*, *design a system*, and *learn the theory behind it* without bouncing between five different tools. It grew from there — and the structure eventually earned its own mythology. The app is split into **three grounds**:

- **Ground Δeva** (`/deva`) — the knowledge realm: guided code tracks + cloud/AI concept lessons. Techno-purple.
- **Ground Λshura** (`/ashura`) — the proving ground: AI mock exams + the free code sandbox. Techno-crimson.
- **GroundΦ** (`/zero`) — the balance point: the two design studios, where knowledge and power meet. Purple ↔ crimson in equilibrium.

> Internal identifiers (localStorage keys, the Go module path, API routes) still use the `ground0` name — renaming those would break saved user data for zero visual gain.

---

## What it does

The app has three product areas, all behind a login gate.

### 1. Code Sandbox — a browser IDE for 6 languages
Write and run **JavaScript, React/JSX, Python, Go, Java, and shell** without installing anything.

- **Project Mode** (`/playground`) — a free scratchpad.
- **Guided Mode** (`/learn`) — level-by-level tutorials per language.

Nothing is faked with a "print the expected answer" trick — the code actually executes:

| Language | How it runs |
|---|---|
| JavaScript | A fresh sandboxed hidden `<iframe>` per run; `console.*` and errors stream back over `postMessage`. Top-level `await` works. |
| React / JSX | Transpiled with Babel Standalone in the page, then rendered inside an iframe with the React UMD build. |
| Python | Real CPython on WebAssembly via **Pyodide** (lazy-loaded from a CDN, then cached). |
| Go & Java | Compiled and run on the free **Wandbox** public API (needs internet). |
| Shell | A hand-written bash interpreter over a virtual filesystem persisted to `localStorage` — variables, pipes, redirects, ~30 commands. |

### 2. Ground0 : Cloud — learning + two design studios + an exam lab
The `/cloud` area is where most of the interesting work is.

- **Learning modules** (`/cloud/:moduleId`) — self-paced lessons on networking, APIs, databases, cloud, DevOps, and AI/ML, each rendered as an animated flow diagram.
- **Architecture Studio** (`/cloud/designer`) — a drag-and-drop cloud-architecture designer. Drop in AWS/Azure/GCP-style components, wire them up, set security-group ports, and get:
  - a live **well-architected review** (correctness / security / design scores + findings),
  - an animated **request→response flow** that shows blocked hops in red,
  - a **load test** that finds the bottleneck tier and suggests one-click fixes,
  - a rough **monthly cost** estimate,
  - and an **"AI generate"** button that turns a plain-English prompt ("a serverless image API with a queue") into a starter design.
- **Agentic Studio** (`/cloud/agent-studio`) — the same idea for LLM-agent pipelines. Design an agent (model → tools → RAG → memory → guardrails), and get a correctness/safety review, a lifecycle simulation, and a "training method → resulting agent" profile.
- **Exam Lab** (`/cloud/exam`) — AI-generated mock certification exams (AWS CCP / SAA / DevOps). Take an exam, get graded, and receive personalized feedback plus an adaptive study plan that targets your weakest domains.

Both studios share one important idea: **every block on the canvas is a node with an abstract `kind`** (`compute`, `database`, `lb`, `agent`, `tool`, …). The name and icon are just a label — all the logic reasons purely off `kind` + `config`. That's why the same engine re-skins across AWS/Azure/GCP by swapping only display names, and why the rule engines stay small and pure.

### 3. Accounts & shell
Login gate, navbar, landing page. Sign in with email/password or GitHub/Google, or jump in as a **guest** (a local-only session that keeps its data on-device).

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Vite + React SPA, port 5173)                       │
│                                                              │
│  • Code sandbox runners (iframe / Pyodide / Babel / Wandbox) │
│  • Canvas UI, drag-drop, instant connection legality         │
│  • React Router: /login (public) + protected app routes      │
│  • localStorage: designs, progress, playground code, guest   │
└───────────────────────────┬─────────────────────────────────┘
                            │  /api/*  (Vite dev-proxy)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Go backend (chi router, port 4100)                          │
│                                                              │
│  auth · progress · exams · studio/cloud · studio/agent · fix │
│  one shared LLM client:  Gemini → Groq → Anthropic           │
└──────────┬───────────────────────────┬──────────────────────┘
           ▼                           ▼
   Postgres (or in-memory)     Redis (or in-process cache)
```

The frontend works **entirely on its own** for the sandbox and the studios' interactive bits; the backend is what turns it from a toy into something with real accounts, cross-device sync, server-computed analysis, and AI.

### What the frontend handles
- **All code execution** — the sandbox never touches my server; code runs in the browser (or on Wandbox for Go/Java).
- **The canvas and interaction** — drag-and-drop, node selection, the animated packet flow, and the *instant* "can A connect to B?" check (`classifyEdge`, kept local so wiring feedback is sub-frame).
- **Routing and the auth gate** — a public `/login` route and a `ProtectedLayout` that bounces unauthenticated visitors to login (remembering where they were headed). Guests get a visible "Guest" tag.
- **Offline-first persistence** — designs (`cloudDesigns`, `agentDesign`), lesson progress, and playground code all live in `localStorage` first. Progress syncs to the server in the background when signed in.

### What the backend handles
- **Accounts & sessions** — custom auth: bcrypt password hashing, opaque session cookies, Google + GitHub OAuth, single-use password-reset tokens. No third-party auth SDK.
- **The studios' heavy computation** — `analyze / simulate / loadtest / loadflow / cost` for the cloud studio and `analyze / simulate / profile` for the agent studio all run server-side in Go, called from the UI as debounced async requests. (The instant connect-time check stays on the client.)
- **The exam lifecycle** — question generation, grading, feedback, history, and the adaptive study plan (which re-grades stored attempts to find weak domains).
- **All AI features** — one shared LLM client threaded through exams, both studios, and the fix-it helper.
- **Persistence** — Postgres for progress, exams, accounts, and the studio catalog, with schema migrations that run automatically on boot.

Everywhere, the backend **degrades gracefully**: no database → in-memory store; no Redis → in-process cache; no AI keys → offline question bank / heuristics / curated templates. The app never hard-fails because a piece of infrastructure is missing.

---

## The AI features

Three AI features, plus AI-generated exams, all sharing one provider chain and all **LLM-first with a built-in offline fallback** so they work with zero keys:

1. **Exam questions + feedback** — generates scenario questions and grades them with personalized, answer-aware feedback (falls back to a hand-written question bank + heuristic feedback).
2. **Natural-language → architecture** — describe a system in English, get a starter design on the canvas (falls back to keyword-matched templates).
3. **Fix suggestions** — click any review finding for an explanation, concrete steps, and a code snippet (falls back to a curated library of fixes).
4. **Adaptive study plan** — rolls up your per-domain exam accuracy and recommends what to focus on (falls back to the same rollup without the LLM prose).

The provider chain is **free-first**: **Gemini → Groq → Anthropic**. It tries each in order and falls through on failure, so a quota-exhausted free key quietly rolls to the next provider, and no keys at all just means every feature uses its offline path.

---

## Tech stack

**Frontend:** Vite 6, React 18 (plain JSX — no TypeScript), React Router 6, Tailwind CSS v4, lucide-react icons, Monaco editor. The design canvas is **hand-built** (SVG + absolutely-positioned divs) — no react-flow, no Excalidraw, no diagram library.

**Backend:** Go — chi (router), pgx/pgxpool (raw SQL, no ORM), golang-migrate (embedded migrations), go-redis, google/uuid, x/oauth2. The LLM clients are raw HTTP (there's no official Go SDK for these providers).

**Data:** Postgres (dedicated local instance), optional Redis, all with automatic in-memory fallbacks.

---

## Getting started

### Prerequisites
- **Node.js 18+** and npm
- **Go 1.23+** (only needed for the backend — the frontend runs without it)
- **Postgres** (optional — the backend falls back to an in-memory store without it)

### Install & run

```bash
npm install

# Terminal 1 — frontend (works on its own for the sandbox + studios)
npm run dev            # Vite dev server on http://localhost:5173

# Terminal 2 — backend (needed for accounts, exams, server-side studio analysis, AI)
npm run goserver       # Go API on http://localhost:4100
```

Vite proxies `/api/*` to the Go server, so you just open **http://localhost:5173** and everything is wired.

The Go server reads `.env` from the repo root automatically. Copy `.env.example` to `.env` and fill in what you want — every value is optional and the app degrades sensibly when one is missing.

### Environment variables

```bash
# --- AI (free-first chain; all optional — omit for offline fallbacks) ---
GEMINI_API_KEY=          # free, no card:  https://aistudio.google.com/apikey
GROQ_API_KEY=            # free, fast Llama: https://console.groq.com/keys
ANTHROPIC_API_KEY=       # paid, optional last-resort fallback

# --- Database (optional — in-memory store without it) ---
DATABASE_URL=postgres://ground0:ground0@localhost:5432/ground0
REDIS_URL=redis://localhost:6379/0

# --- Ports ---
GO_PORT=4100

# --- Auth / OAuth (email+password needs only the DB; OAuth needs a client) ---
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:4100/api/auth/oauth/google/callback
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URL=http://localhost:4100/api/auth/oauth/github/callback
SESSION_COOKIE_NAME=g0_session
SESSION_TTL_HOURS=720
FRONTEND_URL=http://localhost:5173     # where OAuth / reset links return to
RESEND_API_KEY=                        # password-reset email; logs to console without it
```

> **Note:** `.env` and `.env.example` are both gitignored, so real keys stay local.

### Enabling GitHub / Google sign-in
1. Create an OAuth app (GitHub Developer Settings / Google Cloud Console).
2. Set its **Authorization callback URL** to exactly `http://localhost:4100/api/auth/oauth/<provider>/callback` — note the port is **4100** (the Go server owns the callback directly, not the Vite proxy).
3. Put the client id/secret in `.env` and restart the Go server.

The login page asks the backend which providers are configured and only lights up the buttons that are actually live.

---

## Project layout

```
src/                          Frontend (Vite + React)
  main.jsx                    Entry: BrowserRouter → AuthProvider → App
  App.jsx                     Routing: /login + a ProtectedLayout wrapping app routes
  context/AuthContext.jsx     Session hydration + guest mode
  lib/
    api.js                    Fail-soft client (auth, progress, exams)
    studioApi.js              Client for the server-side studio endpoints
    storage.js                localStorage wrapper (keys prefixed "ground0.")
    runners/                  Code-sandbox engines (iframe / Pyodide / Babel / Wandbox / shell)
    cloud/  agent/            Pure client-side helpers (connection legality, etc.)
  data/cloud/                 Component catalogs, templates, blueprints, lesson content
  components/cloud/           The shared canvas + studio panels
  pages/                      Landing, Login, Playground, Learn, Cloud*, CloudDesigner, AgentStudio, ExamLab

go-server/                    Backend (Go module)
  cmd/server/main.go          Wires config → db/cache → LLM client → all route groups
  internal/
    auth/                     Accounts, sessions, OAuth, password reset
    progress/                 Lesson progress (Postgres or in-memory)
    exams/                    Catalog, offline bank, AI questions/feedback, study plan
    studio/cloud/             analyze / simulate / loadtest / cost / generate
    studio/agent/             analyze / simulate / profile
    studio/fix/               AI fix suggestions (shared by both studios)
    llm/                      Provider-agnostic client (Gemini → Groq → Anthropic)
    db/migrations/            SQL schema (runs on startup)
```

For a deeper "where do I change X?" tour, see [`CODEBASE_GUIDE.md`](CODEBASE_GUIDE.md); the backend has its own [`go-server/README.md`](go-server/README.md).

---

## API surface

All under `/api`, proxied from the frontend. Session identity comes from an HttpOnly cookie — the client never sends a user id.

| Group | Endpoints |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/{register,login,logout}` · `GET /auth/{me,providers}` · `POST /auth/password/{forgot,reset}` · `GET /auth/oauth/{provider}/{start,callback}` |
| Progress | `GET/PUT /progress` |
| Exams | `POST /exams` · `POST /exams/{id}/submit` · `GET /exams` · `GET /exams/studyplan` |
| Cloud studio | `POST /studio/cloud/{analyze,simulate,loadtest,loadflow,cost,generate}` · `GET /studio/cloud/specs` |
| Agent studio | `POST /studio/agent/{analyze,simulate,profile}` · `GET /studio/agent/specs` |
| Fix-it | `POST /studio/fix` |

---

## Status & limitations

This is a **learning simulator**, not a provisioning tool — the studios teach architecture and agent-design tradeoffs; they don't stand up real infrastructure or export Terraform. A few things worth knowing:

- **The code sandbox and the studios never require the backend** — code runs in the browser and designs persist to `localStorage`. The server adds accounts, sync, server-computed analysis, and AI.
- **Go/Java execution needs internet** (they run on the external Wandbox API).
- **No test suite / CI yet** — verification so far has been manual and scripted.
- The project is still evolving; the backend was recently ported from an earlier Express server (kept temporarily in `server/` for rollback, but nothing routes to it).
