// Package domain holds the auth entities and their validation rules.
package domain

import (
	"strings"
	"time"
)

const (
	RoleUser  = "USER"
	RoleAdmin = "ADMIN"

	PlanFree    = "FREE"
	PlanPro     = "PRO"
	PlanProPlus = "PRO_PLUS"

	StatusActive  = "ACTIVE"
	StatusExpired = "EXPIRED"
)

type User struct {
	ID          string
	Email       string
	Name        string
	DisplayName string
	PictureURL  string
	Bio         string
	Age         *int
	Role        string
}

type Settings struct {
	UserID              string
	Theme               string // LIGHT | DARK | SYSTEM
	Language            string // ENGLISH | VIETNAMESE | SPANISH
	DailyGoal           int
	TargetRetentionRate float64
	SoundEffects        bool
	HapticFeedback      bool
	AutoPlayAudio       bool
	AllowReminders      bool
	IsNewComer          bool
}

func DefaultSettings(userID string) *Settings {
	return &Settings{UserID: userID, Theme: "SYSTEM", Language: "ENGLISH", DailyGoal: 20,
		TargetRetentionRate: 0.8, SoundEffects: true, HapticFeedback: true, AllowReminders: true, IsNewComer: true}
}

type Subscription struct {
	UserID    string     `json:"-"`
	Plan      string     `json:"plan"`
	Status    string     `json:"status"`
	ExpiresAt *time.Time `json:"expiresAt"`
}

// Effective downgrades an expired subscription to FREE.
func (s Subscription) Effective(now time.Time) Subscription {
	if s.Plan == "" {
		return Subscription{UserID: s.UserID, Plan: PlanFree, Status: StatusActive}
	}
	if s.ExpiresAt != nil && !s.ExpiresAt.After(now) && s.Plan != PlanFree {
		return Subscription{UserID: s.UserID, Plan: PlanFree, Status: StatusExpired, ExpiresAt: s.ExpiresAt}
	}
	return s
}

// UserLookup is the minimal profile exposed to other services.
type UserLookup struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	PictureURL  string `json:"pictureUrl"`
	DailyGoal   int    `json:"dailyGoal"`
}

var languageCodes = map[string]string{"ENGLISH": "en", "VIETNAMESE": "vi", "SPANISH": "es"}

// ParseTheme returns the canonical theme name, case-insensitively.
func ParseTheme(s string) (string, bool) {
	for _, t := range []string{"LIGHT", "DARK", "SYSTEM"} {
		if strings.EqualFold(t, s) {
			return t, true
		}
	}
	return "", false
}

// ParseLanguage maps a language code (en, vi, es) to its canonical name.
func ParseLanguage(code string) (string, bool) {
	for name, c := range languageCodes {
		if strings.EqualFold(c, code) {
			return name, true
		}
	}
	return "", false
}

func LanguageCode(name string) string {
	if c, ok := languageCodes[name]; ok {
		return c
	}
	return "en"
}

var planRank = map[string]int{PlanFree: 0, PlanPro: 1, PlanProPlus: 2}

func ValidPlan(p string) bool { _, ok := planRank[p]; return ok }

// PlanAtLeast reports whether have grants at least the min plan.
func PlanAtLeast(have, min string) bool {
	h, ok := planRank[have]
	if !ok {
		return false
	}
	m, ok := planRank[min]
	return ok && h >= m
}
