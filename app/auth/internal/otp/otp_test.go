package otp

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/halng/Oopsly/app/auth/internal/kv"
)

func TestIssueAndVerify(t *testing.T) {
	ctx := context.Background()
	s := New(kv.NewMemory(), nil)
	code, err := s.Issue(ctx, "A@b.co")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^[1-9]\d{5}$`).MatchString(code) {
		t.Fatalf("code = %q", code)
	}
	if st, _ := s.Verify(ctx, "a@b.co", code); st != Valid {
		t.Fatalf("status = %v", st)
	}
	// single use
	if st, _ := s.Verify(ctx, "a@b.co", code); st != Expired {
		t.Fatalf("reuse status = %v", st)
	}
}

func TestInvalidatedAfterMaxAttempts(t *testing.T) {
	ctx := context.Background()
	s := New(kv.NewMemory(), nil)
	code, _ := s.Issue(ctx, "a@b.co")
	wrong := "000001"
	if code == wrong {
		wrong = "000002"
	}
	for i := 0; i < MaxAttempts; i++ {
		if st, _ := s.Verify(ctx, "a@b.co", wrong); st != Invalid {
			t.Fatalf("attempt %d status = %v", i, st)
		}
	}
	// even the right code is rejected now
	if st, _ := s.Verify(ctx, "a@b.co", code); st != Invalidated {
		t.Fatalf("status = %v", st)
	}
}

func TestExpired(t *testing.T) {
	ctx := context.Background()
	k := kv.NewMemory()
	now := time.Now()
	k.Now = func() time.Time { return now }
	s := New(k, nil)
	code, _ := s.Issue(ctx, "a@b.co")
	k.Now = func() time.Time { return now.Add(TTL + time.Second) }
	if st, _ := s.Verify(ctx, "a@b.co", code); st != Expired {
		t.Fatalf("status = %v", st)
	}
}

func TestTestEmailBypass(t *testing.T) {
	ctx := context.Background()
	s := New(kv.NewMemory(), []string{"qa@oopsly.dev"})
	if !s.IsTestEmail("QA@oopsly.dev") {
		t.Fatal("expected test email")
	}
	if st, _ := s.Verify(ctx, "qa@oopsly.dev", TestCode); st != Valid {
		t.Fatalf("status = %v", st)
	}
	if st, _ := s.Verify(ctx, "other@oopsly.dev", TestCode); st != Expired {
		t.Fatalf("non-test email status = %v", st)
	}
}
