// Package auth holds the authentication, profile and subscription use cases.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	jsonpatch "github.com/evanphx/json-patch/v5"
	"github.com/google/uuid"
	"github.com/halng/Oopsly/app/auth/internal/domain"
	"github.com/halng/Oopsly/app/auth/internal/httpx"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
	"github.com/halng/Oopsly/app/auth/internal/kv"
	"github.com/halng/Oopsly/app/auth/internal/mail"
	"github.com/halng/Oopsly/app/auth/internal/otp"
	"github.com/halng/Oopsly/app/auth/internal/store"
)

const (
	TokenTypeBearer        = "Bearer"
	RefreshTokenKeyPrefix  = "refresh_token:"
	RefreshTokenRedisTTL   = 30 * 24 * time.Hour
	MaxLookupIDs           = 200
	maxDisplayName, maxBio = 50, 255
	minAge, maxAge         = 1, 120
	maxName, maxPictureURL = 255, 500
)

var emailRE = regexp.MustCompile("^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$")

type Service struct {
	Store  store.Store
	KV     kv.KV
	Tokens *jwtx.Manager
	OTP    *otp.Service
	Mail   mail.Sender
	// Async runs fire-and-forget work; tests replace it with a synchronous call.
	Async func(func())
	Now   func() time.Time
}

func New(st store.Store, k kv.KV, tokens *jwtx.Manager, o *otp.Service, m mail.Sender) *Service {
	return &Service{Store: st, KV: k, Tokens: tokens, OTP: o, Mail: m, Async: func(f func()) { go f() }, Now: time.Now}
}

// AuthRes is the token pair returned after login or refresh.
type AuthRes struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	Type         string `json:"type"`
}

func ValidEmail(e string) bool { return emailRE.MatchString(e) }

// SendOTP creates and mails a code (skipped for configured test emails).
func (s *Service) SendOTP(ctx context.Context, email string) error {
	if !ValidEmail(email) {
		return httpx.BadRequest("Invalid Email Format")
	}
	if s.OTP.IsTestEmail(email) {
		return nil
	}
	code, err := s.OTP.Issue(ctx, email)
	if err != nil {
		return err
	}
	s.Async(func() {
		if err := s.Mail.SendOTP(context.Background(), email, code); err != nil {
			slog.Error("failed to send OTP email", "to", mail.Mask(email), "err", err)
		}
	})
	return nil
}

// VerifyOTP validates the code and, on success, creates the user if needed and issues tokens.
func (s *Service) VerifyOTP(ctx context.Context, email, code, name string) (*AuthRes, error) {
	if !ValidEmail(email) || len(code) < 6 {
		return nil, httpx.BadRequest("Invalid request body")
	}
	status, err := s.OTP.Verify(ctx, email, code)
	if err != nil {
		return nil, err
	}
	switch status {
	case otp.Valid:
	case otp.Invalid:
		return nil, httpx.BadRequest("OTP is invalid. Please try again.")
	case otp.Expired:
		return nil, httpx.NotFound("OTP has expired. Please request a new one.")
	default:
		return nil, httpx.Errf(http.StatusTooManyRequests,
			"OTP has been invalidated due to too many failed attempts. Try again after 5 minutes.")
	}

	user, err := s.Store.FindUserByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		if name == "" {
			name = strings.SplitN(email, "@", 2)[0]
		}
		user, err = s.Store.CreateUser(ctx, email, name)
	}
	if err != nil {
		return nil, err
	}
	return s.issueTokens(ctx, user)
}

func (s *Service) plan(ctx context.Context, userID string) (string, error) {
	sub, err := s.Store.GetSubscription(ctx, userID)
	if errors.Is(err, store.ErrNotFound) {
		return domain.PlanFree, nil
	}
	if err != nil {
		return "", err
	}
	return sub.Effective(s.Now()).Plan, nil
}

func (s *Service) issueTokens(ctx context.Context, u *domain.User) (*AuthRes, error) {
	plan, err := s.plan(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	access, err := s.Tokens.AccessToken(u.ID, u.Email, u.Role, plan)
	if err != nil {
		return nil, err
	}
	refresh, err := s.Tokens.RefreshToken(u.Email)
	if err != nil {
		return nil, err
	}
	if err := s.KV.Set(ctx, RefreshTokenKeyPrefix+u.ID, refresh, RefreshTokenRedisTTL); err != nil {
		return nil, err
	}
	return &AuthRes{AccessToken: access, RefreshToken: refresh, Type: TokenTypeBearer}, nil
}

// Refresh issues a new access token for a valid, stored refresh token.
func (s *Service) Refresh(ctx context.Context, refreshToken, email string) (*AuthRes, error) {
	if refreshToken == "" {
		return nil, httpx.BadRequest("Refresh token is required")
	}
	if !ValidEmail(email) {
		return nil, httpx.BadRequest("Invalid email format")
	}
	claims, err := s.Tokens.Parse(refreshToken)
	if err != nil || !strings.EqualFold(claims.Subject, email) {
		return nil, httpx.Unauthorized("Invalid or expired refresh token")
	}
	user, err := s.Store.FindUserByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return nil, httpx.Unauthorized("User not found with email: " + email)
	}
	if err != nil {
		return nil, err
	}
	stored, ok, err := s.KV.Get(ctx, RefreshTokenKeyPrefix+user.ID)
	if err != nil {
		return nil, err
	}
	if !ok || stored != refreshToken {
		return nil, httpx.Unauthorized("Invalid refresh token")
	}
	plan, err := s.plan(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	access, err := s.Tokens.AccessToken(user.ID, user.Email, user.Role, plan)
	if err != nil {
		return nil, err
	}
	return &AuthRes{AccessToken: access, RefreshToken: refreshToken, Type: TokenTypeBearer}, nil
}

func (s *Service) Logout(ctx context.Context, userID string) error {
	return s.KV.Del(ctx, RefreshTokenKeyPrefix+userID)
}

// ValidateToken confirms the token's user still exists.
func (s *Service) ValidateToken(ctx context.Context, userID string) error {
	_, err := s.currentUser(ctx, userID)
	return err
}

func (s *Service) currentUser(ctx context.Context, userID string) (*domain.User, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return nil, httpx.Unauthorized("User not found")
	}
	u, err := s.Store.FindUserByID(ctx, userID)
	if errors.Is(err, store.ErrNotFound) {
		return nil, httpx.Unauthorized("User not found")
	}
	return u, err
}

// --- profile ---

type SettingsRes struct {
	Theme               string  `json:"theme"`
	Language            string  `json:"language"`
	DailyGoal           int     `json:"dailyGoal"`
	SoundEffects        bool    `json:"soundEffects"`
	HapticFeedback      bool    `json:"hapticFeedback"`
	AutoPlayAudio       bool    `json:"autoPlayAudio"`
	FsrsTargetRetention float64 `json:"fsrsTargetRetention"`
	TargetRetentionRate float64 `json:"targetRetentionRate"`
	AllowReminders      bool    `json:"allowReminders"`
	IsNewComer          bool    `json:"isNewComer"`
}

// ProfileRes is the UserProfileRes the web consumes. Progress fields are placeholders:
// real progress is owned by the API service (user_progress).
type ProfileRes struct {
	Name              string      `json:"name"`
	Email             string      `json:"email"`
	DisplayName       string      `json:"displayName"`
	AvatarURL         string      `json:"avatarUrl"`
	Bio               string      `json:"bio"`
	Settings          SettingsRes `json:"settings"`
	XP                int         `json:"xp"`
	StreakDays        int         `json:"streakDays"`
	TotalCardsStudied int         `json:"totalCardsStudied"`
	TotalReviews      int         `json:"totalReviews"`
	RetentionRate     float64     `json:"retentionRate"`
	League            string      `json:"league"`
}

func (s *Service) ensureSettings(ctx context.Context, userID string) (*domain.Settings, error) {
	st, err := s.Store.GetSettings(ctx, userID)
	if errors.Is(err, store.ErrNotFound) {
		st = domain.DefaultSettings(userID)
		err = s.Store.SaveSettings(ctx, st)
	}
	return st, err
}

func (s *Service) Profile(ctx context.Context, userID string) (*ProfileRes, error) {
	u, err := s.currentUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	st, err := s.ensureSettings(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	return &ProfileRes{
		Name: u.Name, Email: u.Email, DisplayName: u.DisplayName, AvatarURL: u.PictureURL, Bio: u.Bio,
		Settings: SettingsRes{
			Theme: st.Theme, Language: domain.LanguageCode(st.Language), DailyGoal: st.DailyGoal,
			SoundEffects: true, HapticFeedback: true, AutoPlayAudio: true,
			FsrsTargetRetention: 0.95, TargetRetentionRate: 0.95, AllowReminders: true, IsNewComer: st.IsNewComer,
		},
		XP: 100, StreakDays: 5, TotalCardsStudied: 200, TotalReviews: 50, RetentionRate: 0.85, League: "GOLD",
	}, nil
}

type UpdateProfileReq struct {
	DisplayName string `json:"displayName"`
	Bio         string `json:"bio"`
	Age         *int   `json:"age"`
}

func validateProfileFields(displayName, bio string, age *int) error {
	switch {
	case strings.TrimSpace(displayName) == "":
		return httpx.BadRequest("Display name cannot be blank")
	case utf8.RuneCountInString(displayName) > maxDisplayName:
		return httpx.BadRequest("Display name must not exceed 50 characters")
	case utf8.RuneCountInString(bio) > maxBio:
		return httpx.BadRequest("Bio must not exceed 255 characters")
	case age != nil && *age < minAge:
		return httpx.BadRequest("Age must be at least 1")
	case age != nil && *age > maxAge:
		return httpx.BadRequest("Age must not exceed 120")
	}
	return nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID string, req UpdateProfileReq) (*ProfileRes, error) {
	if err := validateProfileFields(req.DisplayName, req.Bio, req.Age); err != nil {
		return nil, err
	}
	u, err := s.currentUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	u.DisplayName, u.Bio, u.Age = req.DisplayName, req.Bio, req.Age
	if err := s.Store.UpdateUser(ctx, u); err != nil {
		return nil, err
	}
	return s.Profile(ctx, userID)
}

type UpdateSettingsReq struct {
	Theme         string          `json:"theme"`
	Language      string          `json:"language"`
	SpaceConfig   json.RawMessage `json:"spaceConfig"`
	StudySchedule json.RawMessage `json:"studySchedule"`
}

func present(r json.RawMessage) bool { return len(r) > 0 && string(r) != "null" }

func (s *Service) UpdateSettings(ctx context.Context, userID string, req UpdateSettingsReq) (*ProfileRes, error) {
	switch {
	case strings.TrimSpace(req.Theme) == "":
		return nil, httpx.BadRequest("Theme cannot be blank")
	case strings.TrimSpace(req.Language) == "":
		return nil, httpx.BadRequest("Language cannot be blank")
	case !present(req.SpaceConfig):
		return nil, httpx.BadRequest("Space configuration cannot be null")
	case !present(req.StudySchedule):
		return nil, httpx.BadRequest("Study schedule cannot be null")
	}
	theme, ok := domain.ParseTheme(req.Theme)
	if !ok {
		return nil, httpx.BadRequest("Invalid theme: " + req.Theme)
	}
	lang, ok := domain.ParseLanguage(req.Language)
	if !ok {
		return nil, httpx.BadRequest("Invalid language: " + req.Language)
	}
	u, err := s.currentUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	st, err := s.ensureSettings(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	st.Theme, st.Language = theme, lang
	if err := s.Store.SaveSettings(ctx, st); err != nil {
		return nil, err
	}
	return s.Profile(ctx, userID)
}

func (s *Service) MarkNotNewComer(ctx context.Context, userID string) error {
	u, err := s.currentUser(ctx, userID)
	if err != nil {
		return err
	}
	st, err := s.Store.GetSettings(ctx, u.ID)
	if errors.Is(err, store.ErrNotFound) {
		return httpx.BadRequest("Setting not found for user: " + u.ID)
	}
	if err != nil {
		return err
	}
	st.IsNewComer = false
	return s.Store.SaveSettings(ctx, st)
}

// patchable is the only part of the user a JSON patch may touch.
type patchable struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Bio         string `json:"bio"`
	Age         *int   `json:"age"`
	PictureURL  string `json:"pictureUrl"`
}

var patchableFields = map[string]bool{"name": true, "displayName": true, "bio": true, "age": true, "pictureUrl": true}

// checkPatchPaths rejects any operation whose path/from is outside the patchable fields.
func checkPatchPaths(raw []byte) error {
	var ops []map[string]any
	if err := json.Unmarshal(raw, &ops); err != nil {
		return httpx.BadRequest("Failed to apply JSON patch")
	}
	for _, op := range ops {
		for _, k := range []string{"path", "from"} {
			v, ok := op[k]
			if !ok {
				continue
			}
			p, _ := v.(string)
			if !strings.HasPrefix(p, "/") || !patchableFields[strings.SplitN(p[1:], "/", 2)[0]] {
				return httpx.BadRequest("Failed to apply JSON patch")
			}
		}
	}
	return nil
}

type PatchedUserRes struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	PictureURL  string `json:"pictureUrl"`
	Bio         string `json:"bio"`
	Age         *int   `json:"age"`
}

func (s *Service) PatchProfile(ctx context.Context, userID string, rawPatch []byte) (*PatchedUserRes, error) {
	if err := checkPatchPaths(rawPatch); err != nil {
		return nil, err
	}
	patch, err := jsonpatch.DecodePatch(rawPatch)
	if err != nil {
		return nil, httpx.BadRequest("Failed to apply JSON patch")
	}
	u, err := s.currentUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	target, _ := json.Marshal(patchable{u.Name, u.DisplayName, u.Bio, u.Age, u.PictureURL})
	patched, err := patch.Apply(target)
	if err != nil {
		return nil, httpx.BadRequest("Failed to apply JSON patch")
	}
	var p patchable
	dec := json.NewDecoder(strings.NewReader(string(patched)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&p); err != nil {
		return nil, httpx.BadRequest("Failed to apply JSON patch")
	}
	if err := validateProfileFields(p.DisplayName, p.Bio, p.Age); err != nil {
		return nil, httpx.BadRequest("Validation failed: " + err.Error())
	}
	if utf8.RuneCountInString(p.Name) > maxName || utf8.RuneCountInString(p.PictureURL) > maxPictureURL {
		return nil, httpx.BadRequest("Validation failed: value too long")
	}
	u.Name, u.DisplayName, u.Bio, u.Age, u.PictureURL = p.Name, p.DisplayName, p.Bio, p.Age, p.PictureURL
	if err := s.Store.UpdateUser(ctx, u); err != nil {
		return nil, err
	}
	return &PatchedUserRes{u.ID, u.Email, u.Name, u.DisplayName, u.PictureURL, u.Bio, u.Age}, nil
}

// --- subscription ---

func (s *Service) Subscription(ctx context.Context, userID string) (*domain.Subscription, error) {
	sub, err := s.Store.GetSubscription(ctx, userID)
	if errors.Is(err, store.ErrNotFound) {
		sub = &domain.Subscription{UserID: userID}
	} else if err != nil {
		return nil, err
	}
	eff := sub.Effective(s.Now())
	return &eff, nil
}

type SetSubscriptionReq struct {
	Plan      string     `json:"plan"`
	ExpiresAt *time.Time `json:"expiresAt"`
}

func (s *Service) SetSubscription(ctx context.Context, userID string, req SetSubscriptionReq) (*domain.Subscription, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return nil, httpx.BadRequest("Invalid user id")
	}
	if !domain.ValidPlan(req.Plan) {
		return nil, httpx.BadRequest("Invalid plan: " + req.Plan)
	}
	if _, err := s.Store.FindUserByID(ctx, userID); errors.Is(err, store.ErrNotFound) {
		return nil, httpx.NotFound("User not found")
	} else if err != nil {
		return nil, err
	}
	sub := &domain.Subscription{UserID: userID, Plan: req.Plan, Status: domain.StatusActive, ExpiresAt: req.ExpiresAt}
	if err := s.Store.SaveSubscription(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}

// --- internal lookup ---

func (s *Service) LookupUsers(ctx context.Context, ids []string) ([]domain.UserLookup, error) {
	if len(ids) == 0 {
		return []domain.UserLookup{}, nil
	}
	if len(ids) > MaxLookupIDs {
		return nil, httpx.BadRequest("Too many ids (max 200)")
	}
	for _, id := range ids {
		if _, err := uuid.Parse(id); err != nil {
			return nil, httpx.BadRequest("Invalid id: " + id)
		}
	}
	out, err := s.Store.LookupUsers(ctx, ids)
	if out == nil {
		out = []domain.UserLookup{}
	}
	return out, err
}
