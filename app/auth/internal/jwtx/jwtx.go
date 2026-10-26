// Package jwtx issues and verifies the HMAC tokens shared with the Java API and game service.
package jwtx

import (
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims are the access token claims; sub carries the email.
type Claims struct {
	UserID string `json:"id,omitempty"`
	Role   string `json:"role,omitempty"`
	Plan   string `json:"plan,omitempty"`
	jwt.RegisteredClaims
}

type Manager struct {
	key        []byte
	method     jwt.SigningMethod
	accessTTL  time.Duration
	refreshTTL time.Duration
	Now        func() time.Time
}

// NewManager decodes the Base64 secret like jjwt and picks HS256/384/512 by key length.
func NewManager(b64Secret string, accessTTL, refreshTTL time.Duration) (*Manager, error) {
	key, err := decodeSecret(b64Secret)
	if err != nil {
		return nil, fmt.Errorf("decode JWT secret: %w", err)
	}
	var method jwt.SigningMethod
	switch bits := len(key) * 8; {
	case bits >= 512:
		method = jwt.SigningMethodHS512
	case bits >= 384:
		method = jwt.SigningMethodHS384
	case bits >= 256:
		method = jwt.SigningMethodHS256
	default:
		return nil, errors.New("JWT secret must be at least 256 bits")
	}
	return &Manager{key: key, method: method, accessTTL: accessTTL, refreshTTL: refreshTTL, Now: time.Now}, nil
}

func decodeSecret(s string) ([]byte, error) {
	s = strings.TrimRight(s, "=")
	return base64.RawStdEncoding.DecodeString(s)
}

func (m *Manager) sign(c Claims, ttl time.Duration) (string, error) {
	now := m.Now()
	c.IssuedAt = jwt.NewNumericDate(now)
	c.ExpiresAt = jwt.NewNumericDate(now.Add(ttl))
	return jwt.NewWithClaims(m.method, c).SignedString(m.key)
}

func (m *Manager) AccessToken(userID, email, role, plan string) (string, error) {
	return m.sign(Claims{UserID: userID, Role: role, Plan: plan,
		RegisteredClaims: jwt.RegisteredClaims{Subject: email}}, m.accessTTL)
}

func (m *Manager) RefreshToken(email string) (string, error) {
	return m.sign(Claims{RegisteredClaims: jwt.RegisteredClaims{Subject: email}}, m.refreshTTL)
}

// Parse verifies the signature and expiry and returns the claims.
func (m *Manager) Parse(token string) (*Claims, error) {
	c := &Claims{}
	_, err := jwt.ParseWithClaims(token, c, func(*jwt.Token) (any, error) { return m.key, nil },
		jwt.WithValidMethods([]string{"HS256", "HS384", "HS512"}),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(m.Now))
	if err != nil {
		return nil, err
	}
	return c, nil
}
