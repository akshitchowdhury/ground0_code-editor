package cache

import (
	"context"
	"time"
)

// KV is implemented by both Cache (Redis) and MemoryCache (in-process
// fallback) — studio specs_repo.go depends on this, not a concrete type, so
// callers can swap backends (once Redis is actually available) without
// touching studio code.
type KV interface {
	GetJSON(ctx context.Context, key string, dest any) error
	SetJSON(ctx context.Context, key string, val any, ttl time.Duration)
	Del(ctx context.Context, key string)
}
