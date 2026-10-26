package kv

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestRedis(t *testing.T) {
	ctx := context.Background()
	mr := miniredis.RunT(t)
	r := Redis{C: redis.NewClient(&redis.Options{Addr: mr.Addr()})}
	t.Cleanup(func() { _ = r.C.Close() })

	if _, ok, err := r.Get(ctx, "k"); ok || err != nil {
		t.Fatalf("missing key: ok=%v err=%v", ok, err)
	}
	if err := r.Set(ctx, "k", "v", time.Minute); err != nil {
		t.Fatal(err)
	}
	if v, ok, err := r.Get(ctx, "k"); v != "v" || !ok || err != nil {
		t.Fatalf("Get = %q %v %v", v, ok, err)
	}
	mr.FastForward(2 * time.Minute)
	if _, ok, _ := r.Get(ctx, "k"); ok {
		t.Fatal("key should have expired")
	}
	_ = r.Set(ctx, "a", "1", 0)
	_ = r.Set(ctx, "b", "2", 0)
	if err := r.Del(ctx, "a", "b"); err != nil {
		t.Fatal(err)
	}
	if _, ok, _ := r.Get(ctx, "a"); ok {
		t.Fatal("key should be deleted")
	}

	mr.Close()
	if _, _, err := r.Get(ctx, "k"); err == nil {
		t.Fatal("Get should fail when redis is down")
	}
	if err := r.Set(ctx, "k", "v", 0); err == nil {
		t.Fatal("Set should fail when redis is down")
	}
	if err := r.Del(ctx, "k"); err == nil {
		t.Fatal("Del should fail when redis is down")
	}
}

func TestMemory(t *testing.T) {
	ctx := context.Background()
	now := time.Now()
	k := NewMemory()
	k.Now = func() time.Time { return now }

	if _, ok, _ := k.Get(ctx, "x"); ok {
		t.Fatal("missing key")
	}
	_ = k.Set(ctx, "ttl", "v", time.Minute)
	_ = k.Set(ctx, "forever", "f", 0)
	if v, ok, _ := k.Get(ctx, "ttl"); !ok || v != "v" {
		t.Fatalf("ttl key = %q %v", v, ok)
	}
	now = now.Add(2 * time.Minute)
	if _, ok, _ := k.Get(ctx, "ttl"); ok {
		t.Fatal("ttl key should have expired")
	}
	if v, ok, _ := k.Get(ctx, "forever"); !ok || v != "f" {
		t.Fatal("zero ttl must not expire")
	}
	_ = k.Del(ctx, "forever", "nope")
	if _, ok, _ := k.Get(ctx, "forever"); ok {
		t.Fatal("deleted key")
	}
}
