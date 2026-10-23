package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/halng/Oopsly/app/auth/internal/auth"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
	"github.com/halng/Oopsly/app/auth/internal/kv"
	"github.com/halng/Oopsly/app/auth/internal/otp"
	"github.com/halng/Oopsly/app/auth/internal/store"
	"github.com/halng/Oopsly/app/auth/internal/testutil"
)

const ghost = "33333333-3333-3333-3333-333333333333" // a valid token for a user that does not exist

type faultEnv struct {
	h     http.Handler
	st    *testutil.FaultStore
	kv    *testutil.FaultKV
	token string
}

func newFaultEnv(t *testing.T) *faultEnv {
	t.Helper()
	tokens, err := jwtx.NewManager(secret, time.Hour, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	e := &faultEnv{st: testutil.NewFaultStore(store.NewMemory()), kv: testutil.NewFaultKV(kv.NewMemory())}
	svc := auth.New(e.st, e.kv, tokens, otp.New(e.kv, nil), testutil.NewRecordingMail())
	svc.Async = func(f func()) { f() }
	e.h = (&Handler{Svc: svc, Tokens: tokens, InternalKey: "internal-key"}).Routes()
	e.token, err = tokens.AccessToken(ghost, "ghost@example.com", "USER", "FREE")
	if err != nil {
		t.Fatal(err)
	}
	return e
}

func (e *faultEnv) do(method, path, body, contentType string, headers ...string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "/api/auth"+path, strings.NewReader(body))
	if contentType == "" {
		contentType = "application/json"
	}
	r.Header.Set("Content-Type", contentType)
	for i := 0; i+1 < len(headers); i += 2 {
		r.Header.Set(headers[i], headers[i+1])
	}
	w := httptest.NewRecorder()
	e.h.ServeHTTP(w, r)
	return w
}

func TestMalformedBodiesAreRejected(t *testing.T) {
	e := newFaultEnv(t)
	bearer := []string{"Authorization", "Bearer " + e.token}
	internal := []string{"X-Internal-Key", "internal-key"}
	tests := []struct {
		name, method, path string
		headers            []string
	}{
		{"validate otp", "POST", "/v1/otp/validate", nil},
		{"refresh", "POST", "/v1/users/refresh-token", nil},
		{"update profile", "PATCH", "/v1/user-profiles", bearer},
		{"update settings", "PATCH", "/v1/user-profiles/settings", bearer},
		{"set subscription", "PUT", "/internal/v1/subscriptions/" + ghost, internal},
		{"lookup", "POST", "/internal/v1/users/lookup", internal},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if w := e.do(tc.method, tc.path, "{not json", "", tc.headers...); w.Code != 400 {
				t.Fatalf("status = %d body=%s", w.Code, w.Body)
			}
		})
	}
}

func TestServiceErrorsAreMapped(t *testing.T) {
	e := newFaultEnv(t)
	bearer := []string{"Authorization", "Bearer " + e.token}
	internal := []string{"X-Internal-Key", "internal-key"}
	space := `"spaceConfig":{"AGAIN":1},"studySchedule":{}`
	tests := []struct {
		name, method, path, body, contentType string
		headers                               []string
		want                                  int
	}{
		{"profile of missing user", "GET", "/v1/user-profiles", "", "", bearer, 401},
		{"validate missing user", "GET", "/v1/users/validate", "", "", bearer, 401},
		{"update profile of missing user", "PATCH", "/v1/user-profiles", `{"displayName":"A"}`, "", bearer, 401},
		{"update settings of missing user", "PATCH", "/v1/user-profiles/settings", `{"theme":"dark","language":"en",` + space + `}`, "", bearer, 401},
		{"json patch of missing user", "PATCH", "/v1/user-profiles/profile/updates", `[{"op":"replace","path":"/bio","value":"x"}]`, "application/json-patch+json", bearer, 401},
		{"newcomer of missing user", "PATCH", "/v1/user-profiles/settings/newcomer", "", "", bearer, 401},
		{"invalid plan", "PUT", "/internal/v1/subscriptions/" + ghost, `{"plan":"GOLD"}`, "", internal, 400},
		{"invalid lookup id", "POST", "/internal/v1/users/lookup", `{"ids":["nope"]}`, "", internal, 400},
		{"invalid otp email", "POST", "/v1/otp?email=bad", "", "", nil, 400},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if w := e.do(tc.method, tc.path, tc.body, tc.contentType, tc.headers...); w.Code != tc.want {
				t.Fatalf("status = %d want %d body=%s", w.Code, tc.want, w.Body)
			}
		})
	}
}

func TestUnexpectedErrorsBecome500(t *testing.T) {
	e := newFaultEnv(t)
	bearer := []string{"Authorization", "Bearer " + e.token}

	e.st.Fail("GetSubscription", errors.New("db down"))
	w := e.do("GET", "/v1/subscriptions/me", "", "", bearer...)
	if w.Code != 500 || !strings.Contains(w.Body.String(), "Internal server error") {
		t.Fatalf("subscription: %d %s", w.Code, w.Body)
	}
	if strings.Contains(w.Body.String(), "db down") {
		t.Fatal("internal error details must not leak")
	}

	e.kv.Fail("Del", "", errors.New("redis down"))
	if w := e.do("POST", "/v1/users/logout", "", "", bearer...); w.Code != 500 {
		t.Fatalf("logout: %d %s", w.Code, w.Body)
	}
}
