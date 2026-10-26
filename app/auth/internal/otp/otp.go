// Package otp issues and verifies one-time codes stored in the KV.
package otp

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"math/big"
	"strconv"
	"strings"
	"time"

	"github.com/halng/Oopsly/app/auth/internal/kv"
)

const (
	OTPKeyPrefix     = "otp:"
	AttemptKeyPrefix = "otp_attempt:"
	TTL              = 5 * time.Minute
	MaxAttempts      = 3
	TestCode         = "000000"
)

type Status int

const (
	Valid Status = iota
	Invalid
	Expired
	Invalidated
)

type Service struct {
	kv         kv.KV
	testEmails []string
}

func New(k kv.KV, testEmails []string) *Service { return &Service{kv: k, testEmails: testEmails} }

func (s *Service) IsTestEmail(email string) bool {
	for _, e := range s.testEmails {
		if strings.EqualFold(e, email) {
			return true
		}
	}
	return false
}

// Key normalises the email; the full address is used so different domains never collide.
func Key(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

// Issue creates a 6-digit code, stores it with a fresh attempt counter and returns it.
func (s *Service) Issue(ctx context.Context, email string) (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	code := strconv.Itoa(int(n.Int64()) + 100000)
	k := Key(email)
	if err := s.kv.Set(ctx, OTPKeyPrefix+k, code, TTL); err != nil {
		return "", err
	}
	if err := s.kv.Set(ctx, AttemptKeyPrefix+k, "0", TTL); err != nil {
		return "", err
	}
	return code, nil
}

// Verify checks the code, counting failed attempts.
func (s *Service) Verify(ctx context.Context, email, code string) (Status, error) {
	if s.IsTestEmail(email) && code == TestCode {
		return Valid, nil
	}
	k := Key(email)
	stored, ok, err := s.kv.Get(ctx, OTPKeyPrefix+k)
	if err != nil {
		return Invalid, err
	}
	if !ok {
		return Expired, nil
	}
	attempts := 0
	if v, ok, err := s.kv.Get(ctx, AttemptKeyPrefix+k); err != nil {
		return Invalid, err
	} else if ok {
		attempts, _ = strconv.Atoi(v)
	}
	if attempts >= MaxAttempts {
		return Invalidated, nil
	}
	if subtle.ConstantTimeCompare([]byte(stored), []byte(code)) == 1 {
		return Valid, s.kv.Del(ctx, OTPKeyPrefix+k, AttemptKeyPrefix+k)
	}
	return Invalid, s.kv.Set(ctx, AttemptKeyPrefix+k, strconv.Itoa(attempts+1), TTL)
}
