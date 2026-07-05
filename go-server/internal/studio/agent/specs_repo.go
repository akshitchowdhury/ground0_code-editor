// specs_repo.go ports src/data/cloud/agentComponents.js's MODELS table —
// moved to Postgres (studio_agent_models, shared 0002_studio_catalog
// migration), cached in front like the Cloud studio's specs_repo.go.
package agent

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"ground0.dev/goserver/internal/cache"
)

const catalogTTL = time.Hour

type Model struct {
	ID        string  `json:"id"`
	Label     string  `json:"label"`
	Tier      string  `json:"tier"`
	Reasoning int     `json:"reasoning"`
	CostPer1k float64 `json:"costPer1k"`
}

type SpecsRepo struct {
	pool  *pgxpool.Pool
	cache cache.KV
}

func NewSpecsRepo(pool *pgxpool.Pool, kv cache.KV) *SpecsRepo {
	return &SpecsRepo{pool: pool, cache: kv}
}

func (r *SpecsRepo) Models(ctx context.Context) []Model {
	const key = "studio:agent:models"
	var out []Model
	if r.cache != nil {
		if err := r.cache.GetJSON(ctx, key, &out); err == nil {
			return out
		}
	}
	out = r.queryModels(ctx)
	if r.cache != nil {
		r.cache.SetJSON(ctx, key, out, catalogTTL)
	}
	return out
}

func (r *SpecsRepo) queryModels(ctx context.Context) []Model {
	if r.pool == nil {
		return defaultModels
	}
	rows, err := r.pool.Query(ctx, `SELECT id, label, tier, reasoning, cost_per_1k FROM studio_agent_models ORDER BY sort_order`)
	if err != nil {
		return defaultModels
	}
	defer rows.Close()
	var out []Model
	for rows.Next() {
		var m Model
		if err := rows.Scan(&m.ID, &m.Label, &m.Tier, &m.Reasoning, &m.CostPer1k); err != nil {
			return defaultModels
		}
		out = append(out, m)
	}
	if len(out) == 0 {
		return defaultModels
	}
	return out
}

// ModelsByID fetches Models and indexes them by id, for the frequent
// `MODELS[config.model]` style lookups in analyze.go/profile.go.
func (r *SpecsRepo) ModelsByID(ctx context.Context) map[string]Model {
	byID := map[string]Model{}
	for _, m := range r.Models(ctx) {
		byID[m.ID] = m
	}
	return byID
}

var defaultModels = []Model{
	{"gpt-4o", "GPT-4o", "frontier", 5, 0.0075},
	{"claude-sonnet", "Claude Sonnet", "frontier", 5, 0.009},
	{"llama-70b", "Llama 3.1 70B (OSS)", "mid", 4, 0.0009},
	{"gpt-4o-mini", "GPT-4o mini", "small", 3, 0.0004},
	{"llama-8b", "Llama 3.1 8B (OSS)", "small", 2, 0.0002},
}

// AgentPatterns mirrors agentComponents.js's AGENT_PATTERNS — short static
// labels, not worth a DB round trip.
var AgentPatterns = map[string]string{
	"react":        "ReAct — reason + act loop",
	"plan-execute": "Plan-and-Execute",
	"reflection":   "Reflection — self-critique",
	"router":       "Router — single shot",
}
