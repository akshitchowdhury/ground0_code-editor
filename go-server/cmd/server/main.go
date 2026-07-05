// Ground0: Cloud backend (Go) — Phase 1 of the Express-to-Go migration.
// Replicates /api/health, /api/progress, /api/exams* exactly; runs
// side-by-side with the legacy Express server (server/index.js) on a
// different port until the Vite proxy has cut every route over.
package main

import (
	"context"
	"log"
	"net/http"

	"ground0.dev/goserver/internal/auth"
	"ground0.dev/goserver/internal/cache"
	"ground0.dev/goserver/internal/config"
	"ground0.dev/goserver/internal/db"
	"ground0.dev/goserver/internal/exams"
	"ground0.dev/goserver/internal/httpserver"
	"ground0.dev/goserver/internal/llm"
	"ground0.dev/goserver/internal/progress"
	"ground0.dev/goserver/internal/studio/agent"
	"ground0.dev/goserver/internal/studio/cloud"
	"ground0.dev/goserver/internal/studio/fix"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	var progressStore progress.Store
	var examsStore exams.Store
	dbKind := "memory"

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("[db] Postgres unavailable (%v) — falling back to in-memory store", err)
		progressStore = progress.NewMemoryStore()
		examsStore = exams.NewMemoryStore()
	} else {
		if err := db.Migrate(cfg.DatabaseURL); err != nil {
			log.Fatalf("[db] migration failed: %v", err)
		}
		log.Println("[db] Connected to Postgres, schema ready")
		progressStore = progress.NewPgStore(pool)
		examsStore = exams.NewPgStore(pool)
		dbKind = "postgres"
	}

	var kv cache.KV
	redisCache, err := cache.Connect(cfg.RedisURL)
	cacheKind := "redis"
	if err != nil {
		log.Printf("[cache] Redis unavailable (%v) — using an in-process cache instead", err)
		kv = cache.NewMemoryCache()
		cacheKind = "memory"
	} else {
		kv = redisCache
	}

	// One shared LLM client (Gemini → Groq → Anthropic, free-first) powers
	// exam feedback plus the studio AI features. nil when no keys are set —
	// every feature degrades to its offline fallback.
	llmClient := llm.New(cfg.GeminiKey, cfg.GroqKey, cfg.AnthropicKey)
	if llmClient.Enabled() {
		log.Printf("[ai] providers: %v", llmClient.Providers())
	} else {
		log.Println("[ai] no LLM keys set — all AI features use offline fallbacks")
	}

	ai := exams.NewAI(llmClient)
	cloudSpecs := cloud.NewSpecsRepo(pool, kv)
	agentSpecs := agent.NewSpecsRepo(pool, kv)

	authSvc := auth.NewService(auth.NewRepo(pool), kv, auth.NewMailer(cfg.ResendAPIKey), cfg.SessionCookieName, cfg.SessionTTLHours)
	oauthProviders := auth.NewProviders(cfg)
	if !authSvc.Available() {
		log.Println("[auth] no database — accounts disabled, guest mode only")
	}
	for name := range oauthProviders {
		log.Printf("[auth] %s sign-in configured", name)
	}

	r := httpserver.NewRouter()
	// Optional session resolution on every request; endpoints opt in to
	// requiring it via auth.RequireUser.
	r.Use(authSvc.WithUser)
	r.Get("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		httpserver.JSON(w, http.StatusOK, map[string]any{"ok": true, "db": dbKind, "ai": ai.Enabled(), "cache": cacheKind, "auth": authSvc.Available()})
	})
	auth.Mount(r, auth.NewHandler(authSvc, kv, oauthProviders, cfg.FrontendURL))
	progress.Mount(r, progress.NewHandler(progressStore))
	exams.Mount(r, exams.NewHandler(examsStore, ai))
	cloud.Mount(r, cloud.NewHandler(cloudSpecs, llmClient))
	agent.Mount(r, agent.NewHandler(agentSpecs, llmClient))
	fix.Mount(r, fix.NewHandler(llmClient))

	log.Printf("[server] Ground0: Cloud API (Go) on http://localhost:%s", cfg.Port)
	log.Printf("[server] db=%s ai=%v", dbKind, ai.Enabled())
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
