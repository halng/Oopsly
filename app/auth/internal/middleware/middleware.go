// Package middleware authenticates requests and enforces roles, plans and the internal key.
package middleware

import (
	"crypto/subtle"
	"log/slog"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/halng/Oopsly/app/auth/internal/domain"
	"github.com/halng/Oopsly/app/auth/internal/httpx"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
)

// Principal is the authenticated caller taken from the access token.
type Principal struct {
	UserID string
	Email  string
	Role   string
	Plan   string
}

const principalKey = "principal"

// FromContext returns the caller set by Authenticate.
func FromContext(c *gin.Context) (Principal, bool) {
	v, ok := c.Get(principalKey)
	if !ok {
		return Principal{}, false
	}
	p, ok := v.(Principal)
	return p, ok
}

// Authenticate requires a valid Bearer access token.
func Authenticate(tokens *jwtx.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, ok := httpx.BearerToken(c)
		if !ok {
			httpx.Fail(c, httpx.Unauthorized("You must be logged in to access this resource."))
			return
		}
		claims, err := tokens.Parse(raw)
		if err != nil {
			slog.Warn("JWT authentication failed", "err", err)
			httpx.Fail(c, httpx.Unauthorized("EXPIRED_OR_INVALID_JWT"))
			return
		}
		if _, err := uuid.Parse(claims.UserID); err != nil {
			httpx.Fail(c, httpx.Unauthorized("EXPIRED_OR_INVALID_JWT"))
			return
		}
		c.Set(principalKey, Principal{UserID: claims.UserID, Email: claims.Subject, Role: claims.Role, Plan: claims.Plan})
		c.Next()
	}
}

// RequireRole allows only the listed roles; use after Authenticate.
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		p, ok := FromContext(c)
		if !ok {
			httpx.Fail(c, httpx.Unauthorized("You must be logged in to access this resource."))
			return
		}
		if !slices.Contains(roles, p.Role) {
			httpx.Fail(c, httpx.Forbidden("You do not have permission to access this resource."))
			return
		}
		c.Next()
	}
}

// RequirePlan allows callers whose plan is at least min; use after Authenticate.
func RequirePlan(min string) gin.HandlerFunc {
	return func(c *gin.Context) {
		p, ok := FromContext(c)
		if !ok {
			httpx.Fail(c, httpx.Unauthorized("You must be logged in to access this resource."))
			return
		}
		if !domain.PlanAtLeast(p.Plan, min) {
			httpx.Fail(c, httpx.Forbidden("Your subscription plan does not include this resource."))
			return
		}
		c.Next()
	}
}

// InternalOnly guards service-to-service routes with the shared X-Internal-Key header.
// An empty configured key rejects everything.
func InternalOnly(key string) gin.HandlerFunc {
	return func(c *gin.Context) {
		got := c.GetHeader("X-Internal-Key")
		if key == "" || subtle.ConstantTimeCompare([]byte(got), []byte(key)) != 1 {
			httpx.Fail(c, httpx.Forbidden("Forbidden"))
			return
		}
		c.Next()
	}
}
