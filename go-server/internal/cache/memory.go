package cache

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

// MemoryCache is an in-process, single-instance stand-in for Redis — used
// when Redis isn't available (e.g. this dev machine, where Docker Desktop
// wouldn't stay up and WSL's Redis install needed a sudo password we didn't
// have). Same GetJSON/SetJSON/Del surface as Cache, so specs_repo callers
// don't care which one they got. Doesn't survive a restart and doesn't
// share across multiple server instances — fine for a single-instance dev
// setup; swap in Connect(redisURL) once Redis is actually running.
type MemoryCache struct {
	mu    sync.Mutex
	items map[string]memoryItem
}

type memoryItem struct {
	raw       []byte
	expiresAt time.Time
}

func NewMemoryCache() *MemoryCache {
	return &MemoryCache{items: map[string]memoryItem{}}
}

func (m *MemoryCache) GetJSON(_ context.Context, key string, dest any) error {
	m.mu.Lock()
	item, ok := m.items[key]
	m.mu.Unlock()
	if !ok || time.Now().After(item.expiresAt) {
		return ErrMiss
	}
	if err := json.Unmarshal(item.raw, dest); err != nil {
		return ErrMiss
	}
	return nil
}

func (m *MemoryCache) SetJSON(_ context.Context, key string, val any, ttl time.Duration) {
	raw, err := json.Marshal(val)
	if err != nil {
		return
	}
	m.mu.Lock()
	m.items[key] = memoryItem{raw: raw, expiresAt: time.Now().Add(ttl)}
	m.mu.Unlock()
}

func (m *MemoryCache) Del(_ context.Context, key string) {
	m.mu.Lock()
	delete(m.items, key)
	m.mu.Unlock()
}
