package domain

import (
	"testing"
	"time"
)

func TestParseThemeAndLanguage(t *testing.T) {
	if v, ok := ParseTheme("dark"); !ok || v != "DARK" {
		t.Fatalf("theme = %q %v", v, ok)
	}
	if _, ok := ParseTheme("neon"); ok {
		t.Fatal("neon should be invalid")
	}
	if v, ok := ParseLanguage("VI"); !ok || v != "VIETNAMESE" {
		t.Fatalf("lang = %q %v", v, ok)
	}
	if _, ok := ParseLanguage("ENGLISH"); ok {
		t.Fatal("language is matched by code, not name")
	}
	if LanguageCode("SPANISH") != "es" || LanguageCode("??") != "en" {
		t.Fatal("language code mapping")
	}
}

func TestPlanAtLeast(t *testing.T) {
	tests := []struct {
		have, min string
		want      bool
	}{
		{PlanFree, PlanFree, true}, {PlanFree, PlanPro, false}, {PlanPro, PlanFree, true},
		{PlanProPlus, PlanPro, true}, {PlanPro, PlanProPlus, false}, {"", PlanFree, false}, {PlanPro, "X", false},
	}
	for _, tc := range tests {
		if got := PlanAtLeast(tc.have, tc.min); got != tc.want {
			t.Errorf("PlanAtLeast(%q,%q)=%v want %v", tc.have, tc.min, got, tc.want)
		}
	}
}

func TestSubscriptionEffective(t *testing.T) {
	now := time.Now()
	past, future := now.Add(-time.Hour), now.Add(time.Hour)
	tests := []struct {
		name string
		in   Subscription
		plan string
		stat string
	}{
		{"empty", Subscription{}, PlanFree, StatusActive},
		{"active pro", Subscription{Plan: PlanPro, Status: StatusActive, ExpiresAt: &future}, PlanPro, StatusActive},
		{"no expiry", Subscription{Plan: PlanPro, Status: StatusActive}, PlanPro, StatusActive},
		{"expired", Subscription{Plan: PlanProPlus, Status: StatusActive, ExpiresAt: &past}, PlanFree, StatusExpired},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.in.Effective(now)
			if got.Plan != tc.plan || got.Status != tc.stat {
				t.Fatalf("got %+v", got)
			}
		})
	}
}
