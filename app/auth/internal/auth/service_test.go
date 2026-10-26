package auth_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/halng/Oopsly/app/auth/internal/auth"
	"github.com/halng/Oopsly/app/auth/internal/domain"
	"github.com/halng/Oopsly/app/auth/internal/httpx"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
	"github.com/halng/Oopsly/app/auth/internal/kv"
	"github.com/halng/Oopsly/app/auth/internal/otp"
	"github.com/halng/Oopsly/app/auth/internal/store"
	"github.com/halng/Oopsly/app/auth/internal/testutil"
)

const (
	secret      = "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"
	email       = "ann@example.com"
	unknownUser = "22222222-2222-2222-2222-222222222222"
)

var (
	ctx  = context.Background()
	boom = errors.New("boom")
)

type rig struct {
	svc  *auth.Service
	mem  *store.Memory
	st   *testutil.FaultStore
	kv   *testutil.FaultKV
	mail *testutil.RecordingMail
	tok  *jwtx.Manager
}

func newRig(t *testing.T) *rig {
	t.Helper()
	tok, err := jwtx.NewManager(secret, time.Hour, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	r := &rig{mem: store.NewMemory(), mail: testutil.NewRecordingMail(), tok: tok}
	r.st = testutil.NewFaultStore(r.mem)
	r.kv = testutil.NewFaultKV(kv.NewMemory())
	r.svc = auth.New(r.st, r.kv, tok, otp.New(r.kv, []string{"qa@oopsly.dev"}), r.mail)
	r.svc.Async = func(f func()) { f() }
	return r
}

// user creates the default user directly in the store.
func (r *rig) user(t *testing.T) *domain.User {
	t.Helper()
	u, err := r.mem.CreateUser(ctx, email, "Ann")
	if err != nil {
		t.Fatal(err)
	}
	return u
}

// login runs the OTP flow and returns the tokens.
func (r *rig) login(t *testing.T, to string) *auth.AuthRes {
	t.Helper()
	if err := r.svc.SendOTP(ctx, to); err != nil {
		t.Fatal(err)
	}
	res, err := r.svc.VerifyOTP(ctx, to, r.mail.Code(to), "")
	if err != nil {
		t.Fatal(err)
	}
	return res
}

// otpFor sends an OTP and returns its code without verifying it.
func (r *rig) otpFor(t *testing.T, to string) string {
	t.Helper()
	if err := r.svc.SendOTP(ctx, to); err != nil {
		t.Fatal(err)
	}
	return r.mail.Code(to)
}

func status(t *testing.T, err error) int {
	t.Helper()
	var he *httpx.Error
	if !errors.As(err, &he) {
		t.Fatalf("want *httpx.Error, got %T %v", err, err)
	}
	return he.Status
}

func wantBoom(t *testing.T, err error) {
	t.Helper()
	if !errors.Is(err, boom) {
		t.Fatalf("err = %v, want boom", err)
	}
}

func TestNewDefaultsToBackgroundSend(t *testing.T) {
	r := newRig(t)
	svc := auth.New(r.st, r.kv, r.tok, otp.New(r.kv, nil), r.mail)
	if err := svc.SendOTP(ctx, email); err != nil {
		t.Fatal(err)
	}
	select {
	case <-r.mail.Sent:
	case <-time.After(2 * time.Second):
		t.Fatal("mail was not sent in the background")
	}
}

func TestSendOTP(t *testing.T) {
	r := newRig(t)
	if got := status(t, r.svc.SendOTP(ctx, "not-an-email")); got != 400 {
		t.Fatalf("invalid email status = %d", got)
	}
	if err := r.svc.SendOTP(ctx, "qa@oopsly.dev"); err != nil || len(r.mail.Codes) != 0 {
		t.Fatalf("test email must skip sending: err=%v codes=%v", err, r.mail.Codes)
	}
	r.mail.Err = boom // a failed email is logged, not returned
	if err := r.svc.SendOTP(ctx, email); err != nil {
		t.Fatalf("mail failure leaked: %v", err)
	}
	r.kv.Fail("Set", "otp:", boom)
	wantBoom(t, r.svc.SendOTP(ctx, email))
}

func TestVerifyOTP(t *testing.T) {
	t.Run("bad request", func(t *testing.T) {
		r := newRig(t)
		_, err := r.svc.VerifyOTP(ctx, "bad", "123456", "")
		if status(t, err) != 400 {
			t.Fatal("invalid email")
		}
		_, err = r.svc.VerifyOTP(ctx, email, "123", "")
		if status(t, err) != 400 {
			t.Fatal("short code")
		}
	})
	t.Run("otp store down", func(t *testing.T) {
		r := newRig(t)
		r.kv.Fail("Get", "otp:", boom)
		_, err := r.svc.VerifyOTP(ctx, email, "123456", "")
		wantBoom(t, err)
	})
	t.Run("wrong, expired and invalidated codes", func(t *testing.T) {
		r := newRig(t)
		_, err := r.svc.VerifyOTP(ctx, email, "123456", "")
		if status(t, err) != 404 {
			t.Fatal("expired")
		}
		code := r.otpFor(t, email)
		wrong := "999999"
		if code == wrong {
			wrong = "888888"
		}
		for i := 0; i < otp.MaxAttempts; i++ {
			_, err = r.svc.VerifyOTP(ctx, email, wrong, "")
			if status(t, err) != 400 {
				t.Fatalf("wrong code attempt %d", i)
			}
		}
		_, err = r.svc.VerifyOTP(ctx, email, code, "")
		if status(t, err) != 429 {
			t.Fatal("invalidated")
		}
	})
	t.Run("new user gets a name from the email", func(t *testing.T) {
		r := newRig(t)
		r.login(t, "newbie@example.com")
		u, err := r.mem.FindUserByEmail(ctx, "newbie@example.com")
		if err != nil || u.Name != "newbie" || u.DisplayName != "newbie" {
			t.Fatalf("user = %+v, %v", u, err)
		}
	})
	t.Run("store failures", func(t *testing.T) {
		r := newRig(t)
		code := r.otpFor(t, email)
		r.st.Fail("FindUserByEmail", boom)
		_, err := r.svc.VerifyOTP(ctx, email, code, "Ann")
		wantBoom(t, err)

		r.st.Fail("FindUserByEmail", nil)
		r.st.Fail("CreateUser", boom)
		code = r.otpFor(t, email)
		_, err = r.svc.VerifyOTP(ctx, email, code, "Ann")
		wantBoom(t, err)
	})
	t.Run("token issue failures", func(t *testing.T) {
		r := newRig(t)
		r.user(t)
		code := r.otpFor(t, email)
		r.st.Fail("GetSubscription", boom)
		_, err := r.svc.VerifyOTP(ctx, email, code, "")
		wantBoom(t, err)

		r.st.Fail("GetSubscription", nil)
		r.kv.Fail("Set", auth.RefreshTokenKeyPrefix, boom)
		code = r.otpFor(t, email)
		_, err = r.svc.VerifyOTP(ctx, email, code, "")
		wantBoom(t, err)
	})
	t.Run("expired subscription downgrades the plan claim", func(t *testing.T) {
		r := newRig(t)
		u := r.user(t)
		past := time.Now().Add(-time.Hour)
		_ = r.mem.SaveSubscription(ctx, &domain.Subscription{UserID: u.ID, Plan: domain.PlanPro, Status: domain.StatusActive, ExpiresAt: &past})
		res := r.login(t, email)
		claims, err := r.tok.Parse(res.AccessToken)
		if err != nil || claims.Plan != domain.PlanFree {
			t.Fatalf("plan = %q, %v", claims.Plan, err)
		}
	})
}

func TestRefresh(t *testing.T) {
	r := newRig(t)
	res := r.login(t, email)

	_, err := r.svc.Refresh(ctx, "", email)
	if status(t, err) != 400 {
		t.Fatal("empty token")
	}
	_, err = r.svc.Refresh(ctx, res.RefreshToken, "bad")
	if status(t, err) != 400 {
		t.Fatal("bad email")
	}
	_, err = r.svc.Refresh(ctx, "garbage", email)
	if status(t, err) != 401 {
		t.Fatal("garbage token")
	}
	ghost, _ := r.tok.RefreshToken("ghost@example.com")
	_, err = r.svc.Refresh(ctx, ghost, "ghost@example.com")
	if status(t, err) != 401 {
		t.Fatal("unknown user")
	}

	r.st.Fail("FindUserByEmail", boom)
	_, err = r.svc.Refresh(ctx, res.RefreshToken, email)
	wantBoom(t, err)
	r.st.Fail("FindUserByEmail", nil)

	r.kv.Fail("Get", auth.RefreshTokenKeyPrefix, boom)
	_, err = r.svc.Refresh(ctx, res.RefreshToken, email)
	wantBoom(t, err)
	r.kv.Reset()

	r.st.Fail("GetSubscription", boom)
	_, err = r.svc.Refresh(ctx, res.RefreshToken, email)
	wantBoom(t, err)
	r.st.Fail("GetSubscription", nil)

	if _, err = r.svc.Refresh(ctx, res.RefreshToken, email); err != nil {
		t.Fatalf("happy path: %v", err)
	}
}

func TestCurrentUserAndProfile(t *testing.T) {
	r := newRig(t)
	u := r.user(t)

	for _, id := range []string{"not-a-uuid", unknownUser} {
		_, err := r.svc.Profile(ctx, id)
		if status(t, err) != 401 {
			t.Fatalf("Profile(%q) should be 401", id)
		}
	}
	r.st.Fail("FindUserByID", boom)
	_, err := r.svc.Profile(ctx, u.ID)
	wantBoom(t, err)
	r.st.Fail("FindUserByID", nil)

	r.st.Fail("GetSettings", boom)
	_, err = r.svc.Profile(ctx, u.ID)
	wantBoom(t, err)
	r.st.Fail("GetSettings", nil)

	if err := r.svc.ValidateToken(ctx, u.ID); err != nil {
		t.Fatal(err)
	}
}

func TestUpdateProfile(t *testing.T) {
	r := newRig(t)
	u := r.user(t)
	age := 30

	_, err := r.svc.UpdateProfile(ctx, u.ID, auth.UpdateProfileReq{DisplayName: "A", Bio: strings.Repeat("x", 256)})
	if status(t, err) != 400 {
		t.Fatal("long bio")
	}
	for name, a := range map[string]int{"young": 0, "old": 121} {
		a := a
		_, err = r.svc.UpdateProfile(ctx, u.ID, auth.UpdateProfileReq{DisplayName: "A", Age: &a})
		if status(t, err) != 400 {
			t.Fatalf("%s age", name)
		}
	}
	_, err = r.svc.UpdateProfile(ctx, u.ID, auth.UpdateProfileReq{DisplayName: strings.Repeat("n", 51)})
	if status(t, err) != 400 {
		t.Fatal("long display name")
	}
	_, err = r.svc.UpdateProfile(ctx, unknownUser, auth.UpdateProfileReq{DisplayName: "A", Age: &age})
	if status(t, err) != 401 {
		t.Fatal("unknown user")
	}
	r.st.Fail("UpdateUser", boom)
	_, err = r.svc.UpdateProfile(ctx, u.ID, auth.UpdateProfileReq{DisplayName: "A"})
	wantBoom(t, err)
}

func TestUpdateSettings(t *testing.T) {
	r := newRig(t)
	u := r.user(t)
	raw := []byte(`{}`)
	good := auth.UpdateSettingsReq{Theme: "dark", Language: "en", SpaceConfig: raw, StudySchedule: raw}

	bad := map[string]auth.UpdateSettingsReq{
		"blank theme":    {Language: "en", SpaceConfig: raw, StudySchedule: raw},
		"blank language": {Theme: "dark", SpaceConfig: raw, StudySchedule: raw},
		"no space":       {Theme: "dark", Language: "en", StudySchedule: raw},
		"null schedule":  {Theme: "dark", Language: "en", SpaceConfig: raw, StudySchedule: []byte("null")},
		"bad theme":      {Theme: "neon", Language: "en", SpaceConfig: raw, StudySchedule: raw},
		"bad language":   {Theme: "dark", Language: "klingon", SpaceConfig: raw, StudySchedule: raw},
	}
	for name, req := range bad {
		if _, err := r.svc.UpdateSettings(ctx, u.ID, req); status(t, err) != 400 {
			t.Errorf("%s should be 400, got %v", name, err)
		}
	}
	if _, err := r.svc.UpdateSettings(ctx, unknownUser, good); status(t, err) != 401 {
		t.Fatal("unknown user")
	}
	r.st.Fail("GetSettings", boom)
	_, err := r.svc.UpdateSettings(ctx, u.ID, good)
	wantBoom(t, err)
	r.st.Fail("GetSettings", nil)

	if _, err := r.svc.Profile(ctx, u.ID); err != nil { // create default settings
		t.Fatal(err)
	}
	r.st.Fail("SaveSettings", boom)
	_, err = r.svc.UpdateSettings(ctx, u.ID, good)
	wantBoom(t, err)
	r.st.Fail("SaveSettings", nil)

	res, err := r.svc.UpdateSettings(ctx, u.ID, good)
	if err != nil || res.Settings.Theme != "DARK" {
		t.Fatalf("happy path: %+v %v", res, err)
	}
}

func TestMarkNotNewComer(t *testing.T) {
	r := newRig(t)
	u := r.user(t)

	if status(t, r.svc.MarkNotNewComer(ctx, unknownUser)) != 401 {
		t.Fatal("unknown user")
	}
	if status(t, r.svc.MarkNotNewComer(ctx, u.ID)) != 400 {
		t.Fatal("no settings yet")
	}
	r.st.Fail("GetSettings", boom)
	wantBoom(t, r.svc.MarkNotNewComer(ctx, u.ID))
	r.st.Fail("GetSettings", nil)

	_, _ = r.svc.Profile(ctx, u.ID)
	if err := r.svc.MarkNotNewComer(ctx, u.ID); err != nil {
		t.Fatal(err)
	}
	if st, _ := r.mem.GetSettings(ctx, u.ID); st.IsNewComer {
		t.Fatal("IsNewComer should be false")
	}
}

func TestPatchProfile(t *testing.T) {
	r := newRig(t)
	u := r.user(t)

	bad := map[string]string{
		"not json":          `nope`,
		"outside whitelist": `[{"op":"replace","path":"/email","value":"x@y.z"}]`,
		"from outside":      `[{"op":"move","from":"/role","path":"/bio"}]`,
		"unknown op":        `[{"op":"bogus","path":"/bio"}]`,
		"failed test op":    `[{"op":"test","path":"/bio","value":"zzz"},{"op":"replace","path":"/bio","value":"a"}]`,
		"wrong type":        `[{"op":"replace","path":"/age","value":"old"}]`,
		"blank display":     `[{"op":"replace","path":"/displayName","value":""}]`,
		"name too long":     `[{"op":"replace","path":"/name","value":"` + strings.Repeat("n", 256) + `"}]`,
		"picture too long":  `[{"op":"replace","path":"/pictureUrl","value":"` + strings.Repeat("p", 501) + `"}]`,
	}
	for name, patch := range bad {
		if _, err := r.svc.PatchProfile(ctx, u.ID, []byte(patch)); status(t, err) != 400 {
			t.Errorf("%s should be 400, got %v", name, err)
		}
	}
	ok := []byte(`[{"op":"replace","path":"/bio","value":"hi"}]`)
	if _, err := r.svc.PatchProfile(ctx, unknownUser, ok); status(t, err) != 401 {
		t.Fatal("unknown user")
	}
	r.st.Fail("UpdateUser", boom)
	_, err := r.svc.PatchProfile(ctx, u.ID, ok)
	wantBoom(t, err)
	r.st.Fail("UpdateUser", nil)

	res, err := r.svc.PatchProfile(ctx, u.ID, ok)
	if err != nil || res.Bio != "hi" || res.Email != email {
		t.Fatalf("happy path: %+v %v", res, err)
	}
}

func TestSubscription(t *testing.T) {
	r := newRig(t)
	u := r.user(t)

	sub, err := r.svc.Subscription(ctx, u.ID)
	if err != nil || sub.Plan != domain.PlanFree {
		t.Fatalf("default plan = %+v %v", sub, err)
	}
	r.st.Fail("GetSubscription", boom)
	_, err = r.svc.Subscription(ctx, u.ID)
	wantBoom(t, err)
	r.st.Fail("GetSubscription", nil)

	req := auth.SetSubscriptionReq{Plan: domain.PlanPro}
	if _, err := r.svc.SetSubscription(ctx, "not-a-uuid", req); status(t, err) != 400 {
		t.Fatal("bad user id")
	}
	if _, err := r.svc.SetSubscription(ctx, u.ID, auth.SetSubscriptionReq{Plan: "GOLD"}); status(t, err) != 400 {
		t.Fatal("bad plan")
	}
	if _, err := r.svc.SetSubscription(ctx, unknownUser, req); status(t, err) != 404 {
		t.Fatal("unknown user")
	}
	r.st.Fail("FindUserByID", boom)
	_, err = r.svc.SetSubscription(ctx, u.ID, req)
	wantBoom(t, err)
	r.st.Fail("FindUserByID", nil)
	r.st.Fail("SaveSubscription", boom)
	_, err = r.svc.SetSubscription(ctx, u.ID, req)
	wantBoom(t, err)
	r.st.Fail("SaveSubscription", nil)

	got, err := r.svc.SetSubscription(ctx, u.ID, req)
	if err != nil || got.Plan != domain.PlanPro {
		t.Fatalf("happy path: %+v %v", got, err)
	}
}

func TestLookupUsers(t *testing.T) {
	r := newRig(t)
	u := r.user(t)

	if out, err := r.svc.LookupUsers(ctx, nil); err != nil || out == nil || len(out) != 0 {
		t.Fatalf("empty = %v %v", out, err)
	}
	tooMany := make([]string, auth.MaxLookupIDs+1)
	if _, err := r.svc.LookupUsers(ctx, tooMany); status(t, err) != 400 {
		t.Fatal("too many ids")
	}
	if _, err := r.svc.LookupUsers(ctx, []string{"nope"}); status(t, err) != 400 {
		t.Fatal("invalid id")
	}
	r.st.Fail("LookupUsers", boom)
	_, err := r.svc.LookupUsers(ctx, []string{u.ID})
	wantBoom(t, err)
	r.st.Fail("LookupUsers", nil)

	out, err := r.svc.LookupUsers(ctx, []string{u.ID, unknownUser})
	if err != nil || len(out) != 1 || out[0].ID != u.ID {
		t.Fatalf("lookup = %+v %v", out, err)
	}
	// none found still serialises as [] rather than null
	if out, _ := r.svc.LookupUsers(ctx, []string{unknownUser}); out == nil {
		t.Fatal("no matches should be an empty slice")
	}
}

func TestLogout(t *testing.T) {
	r := newRig(t)
	res := r.login(t, email)
	u, _ := r.mem.FindUserByEmail(ctx, email)
	if err := r.svc.Logout(ctx, u.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := r.svc.Refresh(ctx, res.RefreshToken, email); status(t, err) != 401 {
		t.Fatal("refresh after logout")
	}
	r.kv.Fail("Del", "", boom)
	wantBoom(t, r.svc.Logout(ctx, u.ID))
}
