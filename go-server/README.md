# Ground0: Cloud backend (Go)

Go port of the legacy Express server (`server/`, kept temporarily for comparison).
Same routes, same JSON shapes. Vite proxies `/api` here on `GO_PORT` (default 4100).

## Run it

```bash
cd go-server
go run ./cmd/server
```

(or from repo root: `npm run goserver`)

Reads `.env` from the repo root automatically (checks `./.env` then `../.env`,
so it works whether you run it from `go-server/` or from the repo root).

## Local dev database

This project uses a **dedicated** local Postgres instance — separate from any
other Postgres you might have running on this machine — on port **5433**,
with its own data directory `.ground0-pgdata/` (gitignored) at the repo root.

**Start it** (data directory already initialized, just needs starting):
```bash
"/c/Program Files/PostgreSQL/18/bin/pg_ctl.exe" -D "../.ground0-pgdata" -l "../.ground0-pgdata/logfile.txt" start
```

**Stop it:**
```bash
"/c/Program Files/PostgreSQL/18/bin/pg_ctl.exe" -D "../.ground0-pgdata" stop
```

Credentials: role `ground0` / db `ground0` / password `ground0dev_local` (see
`DATABASE_URL` in `.env`). It's *not* registered as a Windows service (kept
manual on purpose) — start it before `go run ./cmd/server` if you want real
persistence; without it, the backend falls back to an in-memory store automatically.

Schema migrations run automatically on startup (`internal/db/migrations/`,
idempotent `IF NOT EXISTS` DDL).

## Redis

Optional — used from Phase 2 onward to cache studio catalog/rules data.
Not set up on this machine yet (Docker Desktop was unreliable here; WSL2
Ubuntu is available but `apt-get install redis-server` needs a sudo password
this session didn't have). Without it, caching falls back to an in-process
in-memory cache inside the Go service (fine for a single-instance dev setup,
just doesn't survive a restart or share across multiple instances).

## AI providers (exam questions + feedback)

Tried in order, falling through to the offline question bank + free
heuristic feedback if all are unset or a call fails:
1. **Gemini** (`GEMINI_API_KEY`) — free tier, no card required, key from
   https://aistudio.google.com/apikey
2. **Anthropic** (`ANTHROPIC_API_KEY`) — no free tier, optional paid fallback
