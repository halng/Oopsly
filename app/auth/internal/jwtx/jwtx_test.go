package jwtx

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

const javaDefaultSecret = "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"

func newManager(t *testing.T, secret string) *Manager {
	t.Helper()
	m, err := NewManager(secret, time.Hour, 24*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestAlgorithmByKeyLength(t *testing.T) {
	tests := []struct {
		name  string
		bytes int
		alg   string
		err   bool
	}{
		{"short", 16, "", true},
		{"32 bytes", 32, "HS256", false},
		{"48 bytes", 48, "HS384", false},
		{"64 bytes", 64, "HS512", false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			m, err := NewManager(base64.StdEncoding.EncodeToString(make([]byte, tc.bytes)), time.Hour, time.Hour)
			if tc.err {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if m.method.Alg() != tc.alg {
				t.Fatalf("alg = %s, want %s", m.method.Alg(), tc.alg)
			}
		})
	}
}

func TestDefaultSecretIsHS384(t *testing.T) {
	if got := newManager(t, javaDefaultSecret).method.Alg(); got != "HS384" {
		t.Fatalf("alg = %s", got)
	}
}

func TestAccessTokenRoundTrip(t *testing.T) {
	m := newManager(t, javaDefaultSecret)
	tok, err := m.AccessToken("11111111-1111-1111-1111-111111111111", "a@b.co", "USER", "PRO")
	if err != nil {
		t.Fatal(err)
	}
	c, err := m.Parse(tok)
	if err != nil {
		t.Fatal(err)
	}
	if c.UserID != "11111111-1111-1111-1111-111111111111" || c.Subject != "a@b.co" || c.Role != "USER" || c.Plan != "PRO" {
		t.Fatalf("claims = %+v", c)
	}
}

func TestRefreshTokenHasOnlyStandardClaims(t *testing.T) {
	m := newManager(t, javaDefaultSecret)
	tok, _ := m.RefreshToken("a@b.co")
	payload, _ := base64.RawURLEncoding.DecodeString(strings.Split(tok, ".")[1])
	var got map[string]any
	_ = json.Unmarshal(payload, &got)
	for _, k := range []string{"id", "role", "plan"} {
		if _, ok := got[k]; ok {
			t.Fatalf("refresh token must not carry %q", k)
		}
	}
	if got["sub"] != "a@b.co" || got["iat"] == nil || got["exp"] == nil {
		t.Fatalf("payload = %v", got)
	}
}

// Builds a token the way jjwt does with the default Oopsly secret (HS384, sub/id/role claims).
func TestVerifiesJavaStyleToken(t *testing.T) {
	key, _ := base64.StdEncoding.DecodeString(javaDefaultSecret)
	enc := base64.RawURLEncoding.EncodeToString
	exp := time.Now().Add(time.Hour).Unix()
	header := enc([]byte(`{"alg":"HS384"}`))
	payload := enc([]byte(`{"id":"22222222-2222-2222-2222-222222222222","role":"USER","sub":"j@x.io","iat":1700000000,"exp":` + itoa(exp) + `}`))
	mac := hmac.New(sha512.New384, key)
	mac.Write([]byte(header + "." + payload))
	tok := header + "." + payload + "." + enc(mac.Sum(nil))

	c, err := newManager(t, javaDefaultSecret).Parse(tok)
	if err != nil {
		t.Fatal(err)
	}
	if c.UserID != "22222222-2222-2222-2222-222222222222" || c.Role != "USER" || c.Subject != "j@x.io" || c.Plan != "" {
		t.Fatalf("claims = %+v", c)
	}
}

func itoa(n int64) string { b, _ := json.Marshal(n); return string(b) }

func TestParseRejects(t *testing.T) {
	m := newManager(t, javaDefaultSecret)
	good, _ := m.AccessToken("id", "a@b.co", "USER", "FREE")

	expired := newManager(t, javaDefaultSecret)
	expired.Now = func() time.Time { return time.Now().Add(-48 * time.Hour) }
	old, _ := expired.AccessToken("id", "a@b.co", "USER", "FREE")

	other := newManager(t, base64.StdEncoding.EncodeToString([]byte(strings.Repeat("k", 48))))
	foreign, _ := other.AccessToken("id", "a@b.co", "USER", "FREE")

	tests := map[string]string{
		"expired":  old,
		"foreign":  foreign,
		"tampered": good[:len(good)-2] + "xx",
		"garbage":  "not.a.jwt",
		"empty":    "",
		"alg none": "eyJhbGciOiJub25lIn0.eyJzdWIiOiJhIn0.",
	}
	for name, tok := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := m.Parse(tok); err == nil {
				t.Fatal("expected error")
			}
		})
	}
}

func TestNewManagerRejectsBadSecrets(t *testing.T) {
	if _, err := NewManager("***not-base64***", time.Hour, time.Hour); err == nil {
		t.Fatal("non-base64 secret must be rejected")
	}
	if _, err := NewManager(base64.StdEncoding.EncodeToString(make([]byte, 16)), time.Hour, time.Hour); err == nil {
		t.Fatal("secret under 256 bits must be rejected")
	}
}
