// Package db wires the Postgres connection pool. Mirrors server/db.js's
// initStore(): if DATABASE_URL is unset or unreachable, callers fall back to
// an in-memory store (see internal/progress and internal/exams) instead of
// failing to boot.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect tries to reach Postgres within a short timeout, matching Express's
// 4s connectionTimeoutMillis. Returns (nil, err) on any failure so callers
// can fall back to an in-memory store, same as server/db.js's try/catch.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL not set")
	}
	connectCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	pool, err := pgxpool.New(connectCtx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(connectCtx); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
