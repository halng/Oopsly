package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/halng/Oopsly/app/auth/internal/auth"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
	"github.com/halng/Oopsly/app/auth/internal/kv"
	"github.com/halng/Oopsly/app/auth/internal/otp"
	"github.com/halng/Oopsly/app/auth/internal/store"
)

const secret = "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"

func mustMgr(t *testing.T) *jwtx.Manager {
	t.Helper()
	m, err := jwtx.NewManager(secret, time.Hour, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

type fakeMail struct {
	mu    sync.Mutex
	codes map[string]string
}

func (f *fakeMail) SendOTP(_ context.Context, to, code string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.codes[to] = code
	return nil
}

type env struct {
	srv   http.Handler
	mail  *fakeMail
	store *store.Memory
	kv    *kv.Memory
}

func setup(t *testing.T) *env {
	t.Helper()
	tokens, err := jwtx.NewManager(secret, time.Hour, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	e := &env{mail: &fakeMail{codes: map[string]string{}}, store: store.NewMemory(), kv: kv.NewMemory()}
	svc := auth.New(e.store, e.kv, tokens, otp.New(e.kv, []string{"qa@oopsly.dev"}), e.mail)
	svc.Async = func(f func()) { f() }
	h := &Handler{Svc: svc, Tokens: tokens, InternalKey: "internal-key", Origins: []string{"http://localhost:3000"}}
	e.srv = h.Routes()
	return e
}

type resp struct {
	Code int
	Body struct {
		IsSuccess  bool            `json:"isSuccess"`
		Message    string          `json:"message"`
		StatusCode int             `json:"statusCode"`
		Data       json.RawMessage `json:"data"`
	}
}

func (e *env) do(method, path, body, token string, headers ...string) resp {
	r := httptest.NewRequest(method, "/api/auth"+path, strings.NewReader(body))
	if body != "" {
		r.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(headers); i += 2 {
		r.Header.Set(headers[i], headers[i+1])
	}
	w := httptest.NewRecorder()
	e.srv.ServeHTTP(w, r)
	out := resp{Code: w.Code}
	_ = json.Unmarshal(w.Body.Bytes(), &out.Body)
	return out
}

func (e *env) login(t *testing.T, email string) auth.AuthRes {
	t.Helper()
	if r := e.do("POST", "/v1/otp?email="+email, "", ""); r.Code != 200 {
		t.Fatalf("send otp: %d %s", r.Code, r.Body.Message)
	}
	r := e.do("POST", "/v1/otp/validate", `{"email":"`+email+`","otp":"`+e.mail.codes[email]+`","name":"Ann"}`, "")
	if r.Code != 200 {
		t.Fatalf("validate otp: %d %s", r.Code, r.Body.Message)
	}
	var res auth.AuthRes
	_ = json.Unmarshal(r.Body.Data, &res)
	return res
}

func TestHealth(t *testing.T) {
	e := setup(t)
	for _, p := range []string{"/api/auth/actuator/health", "/actuator/health"} {
		w := httptest.NewRecorder()
		e.srv.ServeHTTP(w, httptest.NewRequest("GET", p, nil))
		if w.Code != 200 {
			t.Fatalf("%s = %d", p, w.Code)
		}
	}
}

func TestOTPLoginCreatesUserAndTokens(t *testing.T) {
	e := setup(t)
	res := e.login(t, "ann@x.io")
	if res.Type != "Bearer" || res.AccessToken == "" || res.RefreshToken == "" {
		t.Fatalf("%+v", res)
	}
	claims, err := mustMgr(t).Parse(res.AccessToken)
	if err != nil || claims.Role != "USER" || claims.Plan != "FREE" || claims.Subject != "ann@x.io" {
		t.Fatalf("%+v %v", claims, err)
	}
	u, err := e.store.FindUserByEmail(context.Background(), "ann@x.io")
	if err != nil || u.DisplayName != "Ann" || claims.UserID != u.ID {
		t.Fatalf("%+v %v", u, err)
	}
	// second login reuses the user
	res2 := e.login(t, "ann@x.io")
	c2, _ := mustMgr(t).Parse(res2.AccessToken)
	if c2.UserID != u.ID {
		t.Fatal("user id changed between logins")
	}
}

func TestOTPErrors(t *testing.T) {
	e := setup(t)
	if r := e.do("POST", "/v1/otp?email=bad", "", ""); r.Code != 400 {
		t.Fatalf("bad email = %d", r.Code)
	}
	if r := e.do("POST", "/v1/otp/validate", `{"email":"a@b.co","otp":"123456"}`, ""); r.Code != 404 {
		t.Fatalf("expired = %d", r.Code)
	}
	if r := e.do("POST", "/v1/otp/validate", `{"email":"a@b.co","otp":"12"}`, ""); r.Code != 400 {
		t.Fatalf("short otp = %d", r.Code)
	}
	if r := e.do("POST", "/v1/otp/validate", `nope`, ""); r.Code != 400 {
		t.Fatalf("bad json = %d", r.Code)
	}
	e.do("POST", "/v1/otp?email=a@b.co", "", "")
	wrong := "100000"
	if e.mail.codes["a@b.co"] == wrong {
		wrong = "100001"
	}
	for i := 0; i < otp.MaxAttempts; i++ {
		if r := e.do("POST", "/v1/otp/validate", `{"email":"a@b.co","otp":"`+wrong+`"}`, ""); r.Code != 400 {
			t.Fatalf("wrong otp = %d", r.Code)
		}
	}
	if r := e.do("POST", "/v1/otp/validate", `{"email":"a@b.co","otp":"`+e.mail.codes["a@b.co"]+`"}`, ""); r.Code != 429 {
		t.Fatalf("invalidated = %d", r.Code)
	}
}

func TestTestEmailLogin(t *testing.T) {
	e := setup(t)
	if r := e.do("POST", "/v1/otp?email=qa@oopsly.dev", "", ""); r.Code != 200 || len(e.mail.codes) != 0 {
		t.Fatalf("test email must not send mail: %d %v", r.Code, e.mail.codes)
	}
	if r := e.do("POST", "/v1/otp/validate", `{"email":"qa@oopsly.dev","otp":"000000","name":"QA"}`, ""); r.Code != 200 {
		t.Fatalf("test login = %d", r.Code)
	}
}

func TestRefreshAndLogout(t *testing.T) {
	e := setup(t)
	res := e.login(t, "ann@x.io")
	body := `{"refresh_token":"` + res.RefreshToken + `","user_email":"ann@x.io"}`

	r := e.do("POST", "/v1/users/refresh-token", body, "")
	if r.Code != 200 {
		t.Fatalf("refresh = %d %s", r.Code, r.Body.Message)
	}
	var out auth.AuthRes
	_ = json.Unmarshal(r.Body.Data, &out)
	if out.RefreshToken != res.RefreshToken || out.AccessToken == "" {
		t.Fatalf("%+v", out)
	}
	if r := e.do("POST", "/v1/users/refresh-token", `{"refresh_token":"x.y.z","user_email":"ann@x.io"}`, ""); r.Code != 401 || r.Body.Message != "Invalid or expired refresh token" {
		t.Fatalf("garbage refresh = %d %s", r.Code, r.Body.Message)
	}
	if r := e.do("POST", "/v1/users/refresh-token", `{"refresh_token":"`+res.RefreshToken+`","user_email":"other@x.io"}`, ""); r.Code != 401 {
		t.Fatalf("email mismatch = %d", r.Code)
	}
	if r := e.do("POST", "/v1/users/refresh-token", `{"user_email":"ann@x.io"}`, ""); r.Code != 400 {
		t.Fatalf("missing token = %d", r.Code)
	}

	if r := e.do("POST", "/v1/users/logout", "", out.AccessToken); r.Code != 200 {
		t.Fatalf("logout = %d", r.Code)
	}
	if r := e.do("POST", "/v1/users/refresh-token", body, ""); r.Code != 401 || r.Body.Message != "Invalid refresh token" {
		t.Fatalf("refresh after logout = %d %s", r.Code, r.Body.Message)
	}
}

func TestValidateRequiresToken(t *testing.T) {
	e := setup(t)
	if r := e.do("GET", "/v1/users/validate", "", ""); r.Code != 401 {
		t.Fatalf("no token = %d", r.Code)
	}
	res := e.login(t, "ann@x.io")
	if r := e.do("GET", "/v1/users/validate", "", res.AccessToken); r.Code != 200 {
		t.Fatalf("validate = %d", r.Code)
	}
}

func TestProfileFlow(t *testing.T) {
	e := setup(t)
	tok := e.login(t, "ann@x.io").AccessToken

	r := e.do("GET", "/v1/user-profiles", "", tok)
	if r.Code != 200 {
		t.Fatalf("get = %d", r.Code)
	}
	var p auth.ProfileRes
	_ = json.Unmarshal(r.Body.Data, &p)
	if p.Email != "ann@x.io" || p.Settings.Theme != "SYSTEM" || p.Settings.Language != "en" || !p.Settings.IsNewComer || p.League != "GOLD" || p.XP != 100 {
		t.Fatalf("%+v", p)
	}

	r = e.do("PATCH", "/v1/user-profiles", `{"displayName":"Annie","bio":"hi","age":30}`, tok)
	_ = json.Unmarshal(r.Body.Data, &p)
	if r.Code != 200 || p.DisplayName != "Annie" || p.Bio != "hi" {
		t.Fatalf("update = %d %+v", r.Code, p)
	}
	for name, body := range map[string]string{
		"blank name": `{"displayName":" "}`,
		"age low":    `{"displayName":"a","age":0}`,
		"age high":   `{"displayName":"a","age":121}`,
		"long name":  `{"displayName":"` + strings.Repeat("a", 51) + `"}`,
	} {
		if r := e.do("PATCH", "/v1/user-profiles", body, tok); r.Code != 400 {
			t.Fatalf("%s = %d", name, r.Code)
		}
	}

	settings := `{"theme":"dark","language":"vi","spaceConfig":{},"studySchedule":{}}`
	r = e.do("PATCH", "/v1/user-profiles/settings", settings, tok)
	_ = json.Unmarshal(r.Body.Data, &p)
	if r.Code != 200 || p.Settings.Theme != "DARK" || p.Settings.Language != "vi" {
		t.Fatalf("settings = %d %+v", r.Code, p.Settings)
	}
	for name, body := range map[string]string{
		"bad theme":    `{"theme":"neon","language":"en","spaceConfig":{},"studySchedule":{}}`,
		"bad language": `{"theme":"dark","language":"xx","spaceConfig":{},"studySchedule":{}}`,
		"no space":     `{"theme":"dark","language":"en","studySchedule":{}}`,
		"no schedule":  `{"theme":"dark","language":"en","spaceConfig":{},"studySchedule":null}`,
		"blank theme":  `{"theme":"","language":"en","spaceConfig":{},"studySchedule":{}}`,
	} {
		if r := e.do("PATCH", "/v1/user-profiles/settings", body, tok); r.Code != 400 {
			t.Fatalf("%s = %d", name, r.Code)
		}
	}

	if r := e.do("PATCH", "/v1/user-profiles/settings/newcomer", "", tok); r.Code != 200 {
		t.Fatalf("newcomer = %d", r.Code)
	}
	r = e.do("GET", "/v1/user-profiles", "", tok)
	_ = json.Unmarshal(r.Body.Data, &p)
	if p.Settings.IsNewComer {
		t.Fatal("newcomer flag should be cleared")
	}
}

func TestNewcomerWithoutSettings(t *testing.T) {
	e := setup(t)
	tok := e.login(t, "ann@x.io").AccessToken
	if r := e.do("PATCH", "/v1/user-profiles/settings/newcomer", "", tok); r.Code != 400 {
		t.Fatalf("newcomer before settings exist = %d", r.Code)
	}
}

func TestJSONPatch(t *testing.T) {
	e := setup(t)
	tok := e.login(t, "ann@x.io").AccessToken
	patch := func(body, ct string) resp {
		r := httptest.NewRequest("PATCH", "/api/auth/v1/user-profiles/profile/updates", strings.NewReader(body))
		r.Header.Set("Content-Type", ct)
		r.Header.Set("Authorization", "Bearer "+tok)
		w := httptest.NewRecorder()
		e.srv.ServeHTTP(w, r)
		out := resp{Code: w.Code}
		_ = json.Unmarshal(w.Body.Bytes(), &out.Body)
		return out
	}
	const ct = "application/json-patch+json"

	r := patch(`[{"op":"replace","path":"/bio","value":"new bio"},{"op":"add","path":"/age","value":41}]`, ct)
	if r.Code != 200 || !strings.Contains(string(r.Body.Data), `"bio":"new bio"`) || !strings.Contains(string(r.Body.Data), `"age":41`) {
		t.Fatalf("patch = %d %s", r.Code, r.Body.Data)
	}
	if patch(`[]`, "application/json").Code != 415 {
		t.Fatal("wrong content type must be 415")
	}
	for name, body := range map[string]string{
		"role":       `[{"op":"add","path":"/role","value":"ADMIN"}]`,
		"email":      `[{"op":"replace","path":"/email","value":"x@y.z"}]`,
		"id":         `[{"op":"replace","path":"/id","value":"1"}]`,
		"copy from":  `[{"op":"copy","from":"/role","path":"/bio"}]`,
		"root":       `[{"op":"replace","path":"","value":{}}]`,
		"blank name": `[{"op":"replace","path":"/displayName","value":""}]`,
		"bad json":   `{`,
		"bad op":     `[{"op":"test","path":"/bio","value":"nope"}]`,
	} {
		if r := patch(body, ct); r.Code != 400 {
			t.Fatalf("%s = %d %s", name, r.Code, r.Body.Message)
		}
	}
}

func TestSubscription(t *testing.T) {
	e := setup(t)
	res := e.login(t, "ann@x.io")
	claims, _ := mustMgr(t).Parse(res.AccessToken)

	r := e.do("GET", "/v1/subscriptions/me", "", res.AccessToken)
	if r.Code != 200 || !strings.Contains(string(r.Body.Data), `"plan":"FREE"`) {
		t.Fatalf("me = %d %s", r.Code, r.Body.Data)
	}
	if r := e.do("GET", "/v1/subscriptions/me", "", ""); r.Code != 401 {
		t.Fatalf("anonymous me = %d", r.Code)
	}

	path := "/internal/v1/subscriptions/" + claims.UserID
	if r := e.do("PUT", path, `{"plan":"PRO"}`, ""); r.Code != 403 {
		t.Fatalf("no key = %d", r.Code)
	}
	if r := e.do("PUT", path, `{"plan":"GOLD"}`, "", "X-Internal-Key", "internal-key"); r.Code != 400 {
		t.Fatalf("bad plan = %d", r.Code)
	}
	if r := e.do("PUT", "/internal/v1/subscriptions/33333333-3333-3333-3333-333333333333", `{"plan":"PRO"}`, "", "X-Internal-Key", "internal-key"); r.Code != 404 {
		t.Fatalf("unknown user = %d", r.Code)
	}
	if r := e.do("PUT", path, `{"plan":"PRO"}`, "", "X-Internal-Key", "internal-key"); r.Code != 200 {
		t.Fatalf("set = %d %s", r.Code, r.Body.Message)
	}
	r = e.do("GET", "/v1/subscriptions/me", "", res.AccessToken)
	if !strings.Contains(string(r.Body.Data), `"plan":"PRO"`) {
		t.Fatalf("me after upgrade = %s", r.Body.Data)
	}

	// the new plan shows up in refreshed access tokens
	refreshed := e.do("POST", "/v1/users/refresh-token", `{"refresh_token":"`+res.RefreshToken+`","user_email":"ann@x.io"}`, "")
	var out auth.AuthRes
	_ = json.Unmarshal(refreshed.Body.Data, &out)
	if c, _ := mustMgr(t).Parse(out.AccessToken); c == nil || c.Plan != "PRO" {
		t.Fatalf("refreshed claims = %+v", c)
	}

	// an expired subscription falls back to FREE
	past := time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)
	e.do("PUT", path, `{"plan":"PRO_PLUS","expiresAt":"`+past+`"}`, "", "X-Internal-Key", "internal-key")
	r = e.do("GET", "/v1/subscriptions/me", "", res.AccessToken)
	if !strings.Contains(string(r.Body.Data), `"plan":"FREE"`) || !strings.Contains(string(r.Body.Data), `"status":"EXPIRED"`) {
		t.Fatalf("expired = %s", r.Body.Data)
	}
}

func TestInternalLookup(t *testing.T) {
	e := setup(t)
	res := e.login(t, "ann@x.io")
	claims, _ := mustMgr(t).Parse(res.AccessToken)
	key := []string{"X-Internal-Key", "internal-key"}

	if r := e.do("POST", "/internal/v1/users/lookup", `{"ids":["`+claims.UserID+`"]}`, ""); r.Code != 403 {
		t.Fatalf("no key = %d", r.Code)
	}
	if r := e.do("POST", "/internal/v1/users/lookup", `{"ids":["`+claims.UserID+`"]}`, res.AccessToken); r.Code != 403 {
		t.Fatalf("user token must not open internal route = %d", r.Code)
	}
	r := e.do("POST", "/internal/v1/users/lookup", `{"ids":["`+claims.UserID+`","44444444-4444-4444-4444-444444444444"]}`, "", key...)
	var rows []map[string]any
	_ = json.Unmarshal(r.Body.Data, &rows)
	if r.Code != 200 || len(rows) != 1 || rows[0]["id"] != claims.UserID || rows[0]["displayName"] != "Ann" || rows[0]["dailyGoal"] != float64(20) {
		t.Fatalf("lookup = %d %s", r.Code, r.Body.Data)
	}
	if r := e.do("POST", "/internal/v1/users/lookup", `{"ids":["nope"]}`, "", key...); r.Code != 400 {
		t.Fatalf("bad id = %d", r.Code)
	}
	ids := make([]string, 201)
	for i := range ids {
		ids[i] = `"44444444-4444-4444-4444-444444444444"`
	}
	if r := e.do("POST", "/internal/v1/users/lookup", `{"ids":[`+strings.Join(ids, ",")+`]}`, "", key...); r.Code != 400 {
		t.Fatalf("too many = %d", r.Code)
	}
	if r := e.do("POST", "/internal/v1/users/lookup", `{"ids":[]}`, "", key...); r.Code != 200 {
		t.Fatalf("empty = %d", r.Code)
	}
}

func TestCORS(t *testing.T) {
	e := setup(t)
	r := httptest.NewRequest("OPTIONS", "/api/auth/v1/otp", nil)
	r.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()
	e.srv.ServeHTTP(w, r)
	if w.Code != 204 || w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Fatalf("%d %v", w.Code, w.Header())
	}
	r = httptest.NewRequest("OPTIONS", "/api/auth/v1/otp", nil)
	r.Header.Set("Origin", "http://evil.test")
	w = httptest.NewRecorder()
	e.srv.ServeHTTP(w, r)
	if w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unlisted origin must not be allowed")
	}
}
