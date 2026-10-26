package store

import (
	"context"
	"errors"
	"testing"

	"github.com/halng/Oopsly/app/auth/internal/domain"
)

func TestMemory(t *testing.T) {
	ctx := context.Background()
	m := NewMemory()

	u, err := m.CreateUser(ctx, "Ann@Example.com", "Ann")
	if err != nil {
		t.Fatal(err)
	}
	again, err := m.CreateUser(ctx, "ann@example.com", "Other")
	if err != nil || again.ID != u.ID {
		t.Fatalf("same email (any case) must return the existing user: %+v %v", again, err)
	}
	if _, err := m.FindUserByEmail(ctx, "ann@example.com"); err != nil {
		t.Fatalf("case-insensitive lookup: %v", err)
	}
	if _, err := m.FindUserByID(ctx, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing id = %v", err)
	}

	u.Name = "Renamed"
	if err := m.UpdateUser(ctx, u); err != nil {
		t.Fatal(err)
	}
	if got, _ := m.FindUserByID(ctx, u.ID); got.Name != "Renamed" {
		t.Fatalf("update not stored: %+v", got)
	}
	if err := m.UpdateUser(ctx, &domain.User{ID: "missing"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("update of missing user = %v", err)
	}

	if _, err := m.GetSettings(ctx, u.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("settings before save = %v", err)
	}
	s := domain.DefaultSettings(u.ID)
	s.DailyGoal = 42
	if err := m.SaveSettings(ctx, s); err != nil {
		t.Fatal(err)
	}
	if got, err := m.GetSettings(ctx, u.ID); err != nil || got.DailyGoal != 42 {
		t.Fatalf("settings = %+v %v", got, err)
	}

	if _, err := m.GetSubscription(ctx, "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing subscription = %v", err)
	}
	if err := m.SaveSubscription(ctx, &domain.Subscription{UserID: u.ID, Plan: domain.PlanPro}); err != nil {
		t.Fatal(err)
	}
	if got, err := m.GetSubscription(ctx, u.ID); err != nil || got.Plan != domain.PlanPro {
		t.Fatalf("subscription = %+v %v", got, err)
	}

	other, _ := m.CreateUser(ctx, "bob@example.com", "Bob")
	out, err := m.LookupUsers(ctx, []string{u.ID, other.ID, "missing"})
	if err != nil || len(out) != 2 {
		t.Fatalf("lookup = %+v %v", out, err)
	}
	if out[0].DailyGoal != 42 || out[1].DailyGoal != 20 {
		t.Fatalf("daily goals = %d, %d (want saved 42 and default 20)", out[0].DailyGoal, out[1].DailyGoal)
	}
}
