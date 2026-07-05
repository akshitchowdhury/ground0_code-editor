// specs_repo.go ports src/lib/cloud/specs.js's reference tables — moved from
// compiled JS constants to Postgres (0002_studio_catalog migration), cached
// in front (Redis if available, else an in-process cache — see
// internal/cache) so a request-heavy loadtest/cost call doesn't hit Postgres
// on every lookup.
package cloud

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"ground0.dev/goserver/internal/cache"
)

const catalogTTL = time.Hour

type InstanceType struct {
	ID     string  `json:"id"`
	Label  string  `json:"label"`
	RPS    int     `json:"rps"`
	Hourly float64 `json:"hourly"`
	Note   string  `json:"note"`
}

type DBClass struct {
	ID     string  `json:"id"`
	Label  string  `json:"label"`
	QPS    int     `json:"qps"`
	Hourly float64 `json:"hourly"`
}

type CacheType struct {
	ID     string  `json:"id"`
	Label  string  `json:"label"`
	Hourly float64 `json:"hourly"`
}

// SpecsRepo reads the studio_* catalog tables through a cache. A nil pool
// falls back to the hardcoded defaults below (same numbers as specs.js),
// mirroring the rest of the app's "Postgres unavailable → keep working"
// philosophy.
type SpecsRepo struct {
	pool  *pgxpool.Pool
	cache cache.KV
}

func NewSpecsRepo(pool *pgxpool.Pool, kv cache.KV) *SpecsRepo {
	return &SpecsRepo{pool: pool, cache: kv}
}

func (r *SpecsRepo) InstanceTypes(ctx context.Context) []InstanceType {
	const key = "studio:cloud:instance_types"
	var out []InstanceType
	if r.cache != nil {
		if err := r.cache.GetJSON(ctx, key, &out); err == nil {
			return out
		}
	}
	out = r.queryInstanceTypes(ctx)
	if r.cache != nil {
		r.cache.SetJSON(ctx, key, out, catalogTTL)
	}
	return out
}

func (r *SpecsRepo) queryInstanceTypes(ctx context.Context) []InstanceType {
	if r.pool == nil {
		return defaultInstanceTypes
	}
	rows, err := r.pool.Query(ctx, `SELECT id, label, rps, hourly_usd, COALESCE(note, '') FROM studio_instance_types ORDER BY sort_order`)
	if err != nil {
		return defaultInstanceTypes
	}
	defer rows.Close()
	var out []InstanceType
	for rows.Next() {
		var it InstanceType
		if err := rows.Scan(&it.ID, &it.Label, &it.RPS, &it.Hourly, &it.Note); err != nil {
			return defaultInstanceTypes
		}
		out = append(out, it)
	}
	if len(out) == 0 {
		return defaultInstanceTypes
	}
	return out
}

func (r *SpecsRepo) DBClasses(ctx context.Context) []DBClass {
	const key = "studio:cloud:db_classes"
	var out []DBClass
	if r.cache != nil {
		if err := r.cache.GetJSON(ctx, key, &out); err == nil {
			return out
		}
	}
	out = r.queryDBClasses(ctx)
	if r.cache != nil {
		r.cache.SetJSON(ctx, key, out, catalogTTL)
	}
	return out
}

func (r *SpecsRepo) queryDBClasses(ctx context.Context) []DBClass {
	if r.pool == nil {
		return defaultDBClasses
	}
	rows, err := r.pool.Query(ctx, `SELECT id, label, qps, hourly_usd FROM studio_db_classes ORDER BY sort_order`)
	if err != nil {
		return defaultDBClasses
	}
	defer rows.Close()
	var out []DBClass
	for rows.Next() {
		var c DBClass
		if err := rows.Scan(&c.ID, &c.Label, &c.QPS, &c.Hourly); err != nil {
			return defaultDBClasses
		}
		out = append(out, c)
	}
	if len(out) == 0 {
		return defaultDBClasses
	}
	return out
}

func (r *SpecsRepo) CacheTypes(ctx context.Context) []CacheType {
	const key = "studio:cloud:cache_types"
	var out []CacheType
	if r.cache != nil {
		if err := r.cache.GetJSON(ctx, key, &out); err == nil {
			return out
		}
	}
	out = r.queryCacheTypes(ctx)
	if r.cache != nil {
		r.cache.SetJSON(ctx, key, out, catalogTTL)
	}
	return out
}

func (r *SpecsRepo) queryCacheTypes(ctx context.Context) []CacheType {
	if r.pool == nil {
		return defaultCacheTypes
	}
	rows, err := r.pool.Query(ctx, `SELECT id, label, hourly_usd FROM studio_cache_types ORDER BY sort_order`)
	if err != nil {
		return defaultCacheTypes
	}
	defer rows.Close()
	var out []CacheType
	for rows.Next() {
		var c CacheType
		if err := rows.Scan(&c.ID, &c.Label, &c.Hourly); err != nil {
			return defaultCacheTypes
		}
		out = append(out, c)
	}
	if len(out) == 0 {
		return defaultCacheTypes
	}
	return out
}

func (r *SpecsRepo) Constants(ctx context.Context) map[string]float64 {
	const key = "studio:cloud:constants"
	var out map[string]float64
	if r.cache != nil {
		if err := r.cache.GetJSON(ctx, key, &out); err == nil {
			return out
		}
	}
	out = r.queryConstants(ctx)
	if r.cache != nil {
		r.cache.SetJSON(ctx, key, out, catalogTTL)
	}
	return out
}

func (r *SpecsRepo) queryConstants(ctx context.Context) map[string]float64 {
	if r.pool == nil {
		return defaultConstants
	}
	rows, err := r.pool.Query(ctx, `SELECT key, value FROM studio_constants`)
	if err != nil {
		return defaultConstants
	}
	defer rows.Close()
	out := map[string]float64{}
	for rows.Next() {
		var k string
		var v float64
		if err := rows.Scan(&k, &v); err != nil {
			return defaultConstants
		}
		out[k] = v
	}
	if len(out) == 0 {
		return defaultConstants
	}
	return out
}

// ---------- Defaults (mirror specs.js verbatim; used when Postgres is
// unreachable, same fallback philosophy as the rest of the app) ----------

var defaultInstanceTypes = []InstanceType{
	{"t3.micro", "t3.micro", 250, 0.0104, "burstable, dev-size"},
	{"t3.small", "t3.small", 500, 0.0208, "burstable"},
	{"t3.medium", "t3.medium", 1000, 0.0416, "burstable"},
	{"t3.large", "t3.large", 2000, 0.0832, "burstable"},
	{"m5.large", "m5.large", 3000, 0.096, "general purpose"},
	{"m5.xlarge", "m5.xlarge", 6000, 0.192, "general purpose"},
	{"c5.large", "c5.large", 4000, 0.085, "compute optimized"},
	{"c5.xlarge", "c5.xlarge", 8000, 0.17, "compute optimized"},
}

var defaultDBClasses = []DBClass{
	{"db.t3.micro", "db.t3.micro", 400, 0.017},
	{"db.t3.medium", "db.t3.medium", 1500, 0.068},
	{"db.r5.large", "db.r5.large", 6000, 0.24},
	{"db.r5.xlarge", "db.r5.xlarge", 12000, 0.48},
	{"db.r5.2xlarge", "db.r5.2xlarge", 24000, 0.96},
}

var defaultCacheTypes = []CacheType{
	{"cache.t3.micro", "cache.t3.micro", 0.017},
	{"cache.r5.large", "cache.r5.large", 0.21},
}

var defaultConstants = map[string]float64{
	"hoursPerMonth": 730, "secondsPerMonth": 2592000,
	"cacheHitRatio": 0.8, "cdnOffload": 0.45, "baseLatencyMs": 35,
	"albMonthly": 16.43, "albPerMillionReq": 0.008,
	"natMonthly": 32.4, "natPerMillionReq": 0.6,
	"apigwPerMillionReq": 3.5, "cdnPerMillionReq": 0.9,
	"wafMonthly": 5.0, "wafPerMillionReq": 0.6,
	"lambdaPerMillionReq": 0.6, "dynamoPerMillionReq": 1.25,
	"s3Monthly": 1.5, "s3PerMillionReq": 0.4,
	"sqsPerMillionReq": 0.4, "dnsMonthly": 0.5, "dnsPerMillionReq": 0.4,
}
