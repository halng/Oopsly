package httpx

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() { gin.SetMode(gin.TestMode) }

func ctxFor(method, target, body string) (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, target, strings.NewReader(body))
	return c, w
}

func TestFail(t *testing.T) {
	c, w := ctxFor("GET", "/", "")
	Fail(c, NotFound("nope"))
	if w.Code != 404 || !strings.Contains(w.Body.String(), `"message":"nope"`) {
		t.Fatalf("expected error: %d %s", w.Code, w.Body)
	}
	c, w = ctxFor("GET", "/", "")
	Fail(c, errors.New("secret detail"))
	if w.Code != 500 || strings.Contains(w.Body.String(), "secret detail") || !strings.Contains(w.Body.String(), "Internal server error") {
		t.Fatalf("unexpected error: %d %s", w.Code, w.Body)
	}
}

func TestErrorHelpers(t *testing.T) {
	for want, err := range map[int]*Error{400: BadRequest("x"), 401: Unauthorized("x"), 403: Forbidden("x"), 404: NotFound("x")} {
		if err.Status != want || err.Error() != "x" {
			t.Errorf("%d helper = %+v", want, err)
		}
	}
}

func TestDecode(t *testing.T) {
	var v struct{ A int }
	c, _ := ctxFor("POST", "/", `{"A":2}`)
	if err := Decode(c, &v); err != nil || v.A != 2 {
		t.Fatalf("valid body: %v %+v", err, v)
	}
	c, _ = ctxFor("POST", "/", `{`)
	if err := Decode(c, &v); err == nil {
		t.Fatal("malformed body must fail")
	}
	c, _ = ctxFor("POST", "/", "")
	c.Request.Body = nil
	if err := Decode(c, &v); err == nil {
		t.Fatal("missing body must fail")
	}
}

func TestBearerToken(t *testing.T) {
	c, _ := ctxFor("GET", "/", "")
	if _, ok := BearerToken(c); ok {
		t.Fatal("no header")
	}
	c.Request.Header.Set("Authorization", "bearer abc")
	if tok, ok := BearerToken(c); !ok || tok != "abc" {
		t.Fatalf("token = %q %v", tok, ok)
	}
}

func cors(origins []string, origin, method string) *httptest.ResponseRecorder {
	r := gin.New()
	r.Use(CORS(origins))
	r.Any("/x", func(c *gin.Context) { c.String(200, "ok") })
	req := httptest.NewRequest(method, "/x", nil)
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestCORS(t *testing.T) {
	if got := cors([]string{"*"}, "http://any.dev", "GET").Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("wildcard origin = %q", got)
	}
	w := cors([]string{"http://a.dev"}, "http://a.dev", "GET")
	if w.Header().Get("Access-Control-Allow-Origin") != "http://a.dev" || w.Header().Get("Vary") != "Origin" {
		t.Fatalf("listed origin headers = %v", w.Header())
	}
	if got := cors([]string{"http://a.dev"}, "http://evil.dev", "GET").Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("unlisted origin allowed: %q", got)
	}
	if w := cors([]string{"http://a.dev"}, "http://a.dev", http.MethodOptions); w.Code != 204 {
		t.Fatalf("preflight = %d", w.Code)
	}
	if w := cors(nil, "", "GET"); w.Code != 200 || w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("no origin = %d %v", w.Code, w.Header())
	}
}
