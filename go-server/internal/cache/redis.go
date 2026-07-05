// Package cache wraps go-redis with generic JSON Get/Set helpers used by
// Phase 2's studio catalog cache and Phase 3's session/OAuth-state cache.
// Redis is always a cache, never a source of truth: every caller must
// tolerate it being unreachable and fall through to Postgres.
package cache

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache struct {
	client *redis.Client
}

func Connect(redisURL string) (*Cache, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &Cache{client: client}, nil
}

// ErrMiss is returned by GetJSON when the key doesn't exist or Redis itself
// is unreachable — callers treat both the same way (fall through to
// Postgres), so this deliberately doesn't distinguish "miss" from "down".
var ErrMiss = errors.New("cache: miss")

func (c *Cache) GetJSON(ctx context.Context, key string, dest any) error {
	if c == nil {
		return ErrMiss
	}
	raw, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		return ErrMiss
	}
	if err := json.Unmarshal(raw, dest); err != nil {
		return ErrMiss
	}
	return nil
}

func (c *Cache) SetJSON(ctx context.Context, key string, val any, ttl time.Duration) {
	if c == nil {
		return
	}
	raw, err := json.Marshal(val)
	if err != nil {
		return
	}
	// Best-effort: a failed cache write shouldn't fail the request that
	// triggered it (the caller already has the data from Postgres).
	_ = c.client.Set(ctx, key, raw, ttl).Err()
}

func (c *Cache) Del(ctx context.Context, key string) {
	if c == nil {
		return
	}
	_ = c.client.Del(ctx, key).Err()
}

func (c *Cache) Client() *redis.Client { return c.client }
