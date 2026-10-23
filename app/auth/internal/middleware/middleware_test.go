package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/halng/Oopsly/app/auth/internal/domain"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
)

const (
	secret = "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"
	uid    = "11111111-1111-1111-1111-111111111111"
)

func mgr(t *testing.T) *jwtx.Manager {
	t.Helper()
	m, err := jwtx.NewManager(secret, time.Hour, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func init() { gin.SetMode(gin.TestMode) }

// chain mounts the middlewares in front of a handler that echoes the caller id.
func chain(mws ...gin.HandlerFunc) http.Handler {
	r := gin.New()
	handlers := append(mws, func(c *gin.Context) {
		p, _ := FromContext(c)
		_, _ = c.Writer.WriteString(p.UserID)
	})
	r.Any("/x", handlers...)
	return r
}

func do(h http.Handler, header string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("GET", "/x", nil)
	if header != "" {
		r.Header.Set("Authorization", header)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestAuthenticate(t *testing.T) {
	m := mgr(t)
	good, _ := m.AccessToken(uid, "a@b.co", "USER", "FREE")
	badID, _ := m.AccessToken("not-a-uuid", "a@b.co", "USER", "FREE")
	h := chain(Authenticate(m))
	tests := []struct {
		name   string
		header string
		status int
	}{
		{"missing", "", 401},
		{"wrong scheme", "Basic abc", 401},
		{"garbage", "Bearer nope", 401},
		{"non-uuid id", "Bearer " + badID, 401},
		{"good", "Bearer " + good, 200},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := do(h, tc.header)
			if w.Code != tc.status {
				t.Fatalf("status = %d body=%s", w.Code, w.Body)
			}
			if tc.status == 200 && w.Body.String() != uid {
				t.Fatalf("principal = %q", w.Body)
			}
		})
	}
}

func TestRequireRoleAndPlan(t *testing.T) {
	m := mgr(t)
	token := func(role, plan string) string {
		tok, _ := m.AccessToken(uid, "a@b.co", role, plan)
		return "Bearer " + tok
	}
	adminOnly := chain(Authenticate(m), RequireRole(domain.RoleAdmin))
	pro := chain(Authenticate(m), RequirePlan(domain.PlanPro))

	if c := do(adminOnly, token("USER", "FREE")).Code; c != 403 {
		t.Fatalf("user on admin route = %d", c)
	}
	if c := do(adminOnly, token("ADMIN", "FREE")).Code; c != 200 {
		t.Fatalf("admin on admin route = %d", c)
	}
	if c := do(pro, token("USER", "FREE")).Code; c != 403 {
		t.Fatalf("free on pro route = %d", c)
	}
	if c := do(pro, token("USER", "PRO_PLUS")).Code; c != 200 {
		t.Fatalf("pro_plus on pro route = %d", c)
	}
	// guards without Authenticate must not pass
	if c := do(chain(RequireRole("USER")), "").Code; c != 401 {
		t.Fatalf("unauthenticated role = %d", c)
	}
	if c := do(chain(RequirePlan(domain.PlanFree)), "").Code; c != 401 {
		t.Fatalf("unauthenticated plan = %d", c)
	}
}

func TestInternalOnly(t *testing.T) {
	req := func(h http.Handler, key string) int {
		r := httptest.NewRequest("POST", "/x", nil)
		if key != "" {
			r.Header.Set("X-Internal-Key", key)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w.Code
	}
	if c := req(chain(InternalOnly("s3cret")), "s3cret"); c != 200 {
		t.Fatalf("matching key = %d", c)
	}
	if c := req(chain(InternalOnly("s3cret")), "wrong"); c != 403 {
		t.Fatalf("wrong key = %d", c)
	}
	if c := req(chain(InternalOnly("s3cret")), ""); c != 403 {
		t.Fatalf("no key = %d", c)
	}
	if c := req(chain(InternalOnly("")), ""); c != 403 {
		t.Fatalf("unset key must reject, got %d", c)
	}
}
