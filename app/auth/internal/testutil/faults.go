// Package testutil provides fault-injecting wrappers so tests can reach error branches.
package testutil

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/halng/Oopsly/app/auth/internal/domain"
	"github.com/halng/Oopsly/app/auth/internal/kv"
	"github.com/halng/Oopsly/app/auth/internal/store"
)

// FaultStore fails the named Store methods (e.g. "FindUserByID") with the given error.
type FaultStore struct {
	store.Store
	mu   sync.Mutex
	fail map[string]error
}

func NewFaultStore(inner store.Store) *FaultStore {
	return &FaultStore{Store: inner, fail: map[string]error{}}
}

// Fail makes method return err until Heal is called; a nil err clears it.
func (f *FaultStore) Fail(method string, err error) *FaultStore {
	f.mu.Lock()
	defer f.mu.Unlock()
	if err == nil {
		delete(f.fail, method)
	} else {
		f.fail[method] = err
	}
	return f
}

func (f *FaultStore) err(method string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.fail[method]
}

func (f *FaultStore) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	if err := f.err("FindUserByEmail"); err != nil {
		return nil, err
	}
	return f.Store.FindUserByEmail(ctx, email)
}

func (f *FaultStore) FindUserByID(ctx context.Context, id string) (*domain.User, error) {
	if err := f.err("FindUserByID"); err != nil {
		return nil, err
	}
	return f.Store.FindUserByID(ctx, id)
}

func (f *FaultStore) CreateUser(ctx context.Context, email, name string) (*domain.User, error) {
	if err := f.err("CreateUser"); err != nil {
		return nil, err
	}
	return f.Store.CreateUser(ctx, email, name)
}

func (f *FaultStore) UpdateUser(ctx context.Context, u *domain.User) error {
	if err := f.err("UpdateUser"); err != nil {
		return err
	}
	return f.Store.UpdateUser(ctx, u)
}

func (f *FaultStore) GetSettings(ctx context.Context, userID string) (*domain.Settings, error) {
	if err := f.err("GetSettings"); err != nil {
		return nil, err
	}
	return f.Store.GetSettings(ctx, userID)
}

func (f *FaultStore) SaveSettings(ctx context.Context, s *domain.Settings) error {
	if err := f.err("SaveSettings"); err != nil {
		return err
	}
	return f.Store.SaveSettings(ctx, s)
}

func (f *FaultStore) GetSubscription(ctx context.Context, userID string) (*domain.Subscription, error) {
	if err := f.err("GetSubscription"); err != nil {
		return nil, err
	}
	return f.Store.GetSubscription(ctx, userID)
}

func (f *FaultStore) SaveSubscription(ctx context.Context, s *domain.Subscription) error {
	if err := f.err("SaveSubscription"); err != nil {
		return err
	}
	return f.Store.SaveSubscription(ctx, s)
}

func (f *FaultStore) LookupUsers(ctx context.Context, ids []string) ([]domain.UserLookup, error) {
	if err := f.err("LookupUsers"); err != nil {
		return nil, err
	}
	return f.Store.LookupUsers(ctx, ids)
}

// FaultKV fails operations whose name ("Get", "Set", "Del") and key prefix match a rule.
type FaultKV struct {
	kv.KV
	mu    sync.Mutex
	rules []rule
}

type rule struct {
	op, prefix string
	err        error
}

func NewFaultKV(inner kv.KV) *FaultKV { return &FaultKV{KV: inner} }

// Fail adds a rule; an empty prefix matches every key.
func (f *FaultKV) Fail(op, keyPrefix string, err error) *FaultKV {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.rules = append(f.rules, rule{op, keyPrefix, err})
	return f
}

// Reset removes all rules.
func (f *FaultKV) Reset() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.rules = nil
}

func (f *FaultKV) check(op, key string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, r := range f.rules {
		if r.op == op && strings.HasPrefix(key, r.prefix) {
			return r.err
		}
	}
	return nil
}

func (f *FaultKV) Get(ctx context.Context, key string) (string, bool, error) {
	if err := f.check("Get", key); err != nil {
		return "", false, err
	}
	return f.KV.Get(ctx, key)
}

func (f *FaultKV) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	if err := f.check("Set", key); err != nil {
		return err
	}
	return f.KV.Set(ctx, key, value, ttl)
}

func (f *FaultKV) Del(ctx context.Context, keys ...string) error {
	for _, k := range keys {
		if err := f.check("Del", k); err != nil {
			return err
		}
	}
	return f.KV.Del(ctx, keys...)
}

// RecordingMail captures sent OTPs and can be told to fail.
type RecordingMail struct {
	mu    sync.Mutex
	Codes map[string]string
	Err   error
	Sent  chan struct{}
}

func NewRecordingMail() *RecordingMail {
	return &RecordingMail{Codes: map[string]string{}, Sent: make(chan struct{}, 8)}
}

func (m *RecordingMail) SendOTP(_ context.Context, to, code string) error {
	m.mu.Lock()
	m.Codes[to] = code
	err := m.Err
	m.mu.Unlock()
	m.Sent <- struct{}{}
	return err
}

func (m *RecordingMail) Code(to string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.Codes[to]
}
