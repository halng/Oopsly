// Package kv is the small key-value surface the service needs from Redis.
package kv

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type KV interface {
	// Get returns ok=false when the key is missing or expired.
	Get(ctx context.Context, key string) (value string, ok bool, err error)
	Set(ctx context.Context, key, value string, ttl time.Duration) error
	Del(ctx context.Context, keys ...string) error
}

type Redis struct{ C *redis.Client }

func (r Redis) Get(ctx context.Context, key string) (string, bool, error) {
	v, err := r.C.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", false, nil
	}
	return v, err == nil, err
}

func (r Redis) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	return r.C.Set(ctx, key, value, ttl).Err()
}

func (r Redis) Del(ctx context.Context, keys ...string) error { return r.C.Del(ctx, keys...).Err() }

// Memory is an in-process KV for tests.
type Memory struct {
	mu  sync.Mutex
	m   map[string]entry
	Now func() time.Time
}

type entry struct {
	v   string
	exp time.Time
}

func NewMemory() *Memory { return &Memory{m: map[string]entry{}, Now: time.Now} }

func (k *Memory) Get(_ context.Context, key string) (string, bool, error) {
	k.mu.Lock()
	defer k.mu.Unlock()
	e, ok := k.m[key]
	if !ok || (!e.exp.IsZero() && !e.exp.After(k.Now())) {
		delete(k.m, key)
		return "", false, nil
	}
	return e.v, true, nil
}

func (k *Memory) Set(_ context.Context, key, value string, ttl time.Duration) error {
	k.mu.Lock()
	defer k.mu.Unlock()
	e := entry{v: value}
	if ttl > 0 {
		e.exp = k.Now().Add(ttl)
	}
	k.m[key] = e
	return nil
}

func (k *Memory) Del(_ context.Context, keys ...string) error {
	k.mu.Lock()
	defer k.mu.Unlock()
	for _, key := range keys {
		delete(k.m, key)
	}
	return nil
}
