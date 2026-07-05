// Package progress ports server/db.js's cloud_progress store + the
// GET/PUT /api/progress routes from server/index.js, keeping the exact same
// Postgres-or-in-memory-fallback behavior.
package progress

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store interface {
	Kind() string
	GetProgress(ctx context.Context, userID string) (map[string]json.RawMessage, error)
	SetProgress(ctx context.Context, userID, moduleID string, completed []any) error
}

// ---------- Postgres ----------

type pgStore struct{ pool *pgxpool.Pool }

func NewPgStore(pool *pgxpool.Pool) Store { return &pgStore{pool: pool} }

func (s *pgStore) Kind() string { return "postgres" }

func (s *pgStore) GetProgress(ctx context.Context, userID string) (map[string]json.RawMessage, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT module_id, completed FROM cloud_progress WHERE user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]json.RawMessage{}
	for rows.Next() {
		var moduleID string
		var completed []byte
		if err := rows.Scan(&moduleID, &completed); err != nil {
			return nil, err
		}
		out[moduleID] = completed
	}
	return out, rows.Err()
}

func (s *pgStore) SetProgress(ctx context.Context, userID, moduleID string, completed []any) error {
	raw, err := json.Marshal(completed)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO cloud_progress (user_id, module_id, completed, updated_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (user_id, module_id) DO UPDATE SET completed = $3, updated_at = now()
	`, userID, moduleID, raw)
	return err
}

// ---------- In-memory fallback ----------

type memoryStore struct {
	mu   sync.Mutex
	data map[string]map[string][]any
}

func NewMemoryStore() Store {
	return &memoryStore{data: map[string]map[string][]any{}}
}

func (s *memoryStore) Kind() string { return "memory" }

func (s *memoryStore) GetProgress(_ context.Context, userID string) (map[string]json.RawMessage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := map[string]json.RawMessage{}
	for moduleID, completed := range s.data[userID] {
		raw, _ := json.Marshal(completed)
		out[moduleID] = raw
	}
	return out, nil
}

func (s *memoryStore) SetProgress(_ context.Context, userID, moduleID string, completed []any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cur, ok := s.data[userID]
	if !ok {
		cur = map[string][]any{}
		s.data[userID] = cur
	}
	cur[moduleID] = completed
	return nil
}
