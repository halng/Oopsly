package store

import (
	"context"
	"strconv"
	"strings"
	"sync"

	"github.com/halng/Oopsly/app/auth/internal/domain"
)

// Memory is an in-process Store for tests.
type Memory struct {
	mu       sync.Mutex
	seq      int
	users    map[string]*domain.User
	settings map[string]*domain.Settings
	subs     map[string]*domain.Subscription
}

func NewMemory() *Memory {
	return &Memory{users: map[string]*domain.User{}, settings: map[string]*domain.Settings{}, subs: map[string]*domain.Subscription{}}
}

func (m *Memory) FindUserByEmail(_ context.Context, email string) (*domain.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, u := range m.users {
		if strings.EqualFold(u.Email, email) {
			c := *u
			return &c, nil
		}
	}
	return nil, ErrNotFound
}

func (m *Memory) FindUserByID(_ context.Context, id string) (*domain.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[id]; ok {
		c := *u
		return &c, nil
	}
	return nil, ErrNotFound
}

func (m *Memory) CreateUser(ctx context.Context, email, name string) (*domain.User, error) {
	if u, err := m.FindUserByEmail(ctx, email); err == nil {
		return u, nil
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	id := "00000000-0000-0000-0000-" + strings.Repeat("0", 12-len(strconv.Itoa(m.seq))) + strconv.Itoa(m.seq)
	u := &domain.User{ID: id, Email: email, Name: name, DisplayName: name, Role: domain.RoleUser}
	m.users[id] = u
	m.subs[id] = &domain.Subscription{UserID: id, Plan: domain.PlanFree, Status: domain.StatusActive}
	c := *u
	return &c, nil
}

func (m *Memory) UpdateUser(_ context.Context, u *domain.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.users[u.ID]; !ok {
		return ErrNotFound
	}
	c := *u
	m.users[u.ID] = &c
	return nil
}

func (m *Memory) GetSettings(_ context.Context, userID string) (*domain.Settings, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.settings[userID]; ok {
		c := *s
		return &c, nil
	}
	return nil, ErrNotFound
}

func (m *Memory) SaveSettings(_ context.Context, s *domain.Settings) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c := *s
	m.settings[s.UserID] = &c
	return nil
}

func (m *Memory) GetSubscription(_ context.Context, userID string) (*domain.Subscription, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.subs[userID]; ok {
		c := *s
		return &c, nil
	}
	return nil, ErrNotFound
}

func (m *Memory) SaveSubscription(_ context.Context, s *domain.Subscription) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c := *s
	m.subs[s.UserID] = &c
	return nil
}

func (m *Memory) LookupUsers(_ context.Context, ids []string) ([]domain.UserLookup, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []domain.UserLookup
	for _, id := range ids {
		u, ok := m.users[id]
		if !ok {
			continue
		}
		goal := 20
		if s, ok := m.settings[id]; ok {
			goal = s.DailyGoal
		}
		out = append(out, domain.UserLookup{ID: id, Name: u.Name, DisplayName: u.DisplayName, PictureURL: u.PictureURL, DailyGoal: goal})
	}
	return out, nil
}
