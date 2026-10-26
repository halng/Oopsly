package otp_test

import (
	"context"
	"errors"
	"testing"

	"github.com/halng/Oopsly/app/auth/internal/kv"
	"github.com/halng/Oopsly/app/auth/internal/otp"
	"github.com/halng/Oopsly/app/auth/internal/testutil"
)

var boom = errors.New("boom")

func TestIssueFailures(t *testing.T) {
	ctx := context.Background()
	f := testutil.NewFaultKV(kv.NewMemory()).Fail("Set", otp.OTPKeyPrefix, boom)
	if _, err := otp.New(f, nil).Issue(ctx, "a@b.co"); !errors.Is(err, boom) {
		t.Fatalf("code store failure = %v", err)
	}
	f = testutil.NewFaultKV(kv.NewMemory()).Fail("Set", otp.AttemptKeyPrefix, boom)
	if _, err := otp.New(f, nil).Issue(ctx, "a@b.co"); !errors.Is(err, boom) {
		t.Fatalf("attempt store failure = %v", err)
	}
}

func TestVerifyFailures(t *testing.T) {
	ctx := context.Background()
	mem := kv.NewMemory()
	code, err := otp.New(mem, nil).Issue(ctx, "a@b.co")
	if err != nil {
		t.Fatal(err)
	}

	f := testutil.NewFaultKV(mem).Fail("Get", otp.OTPKeyPrefix, boom)
	if _, err := otp.New(f, nil).Verify(ctx, "a@b.co", code); !errors.Is(err, boom) {
		t.Fatalf("code read failure = %v", err)
	}
	f = testutil.NewFaultKV(mem).Fail("Get", otp.AttemptKeyPrefix, boom)
	if _, err := otp.New(f, nil).Verify(ctx, "a@b.co", code); !errors.Is(err, boom) {
		t.Fatalf("attempt read failure = %v", err)
	}
}
