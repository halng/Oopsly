// Package handler wires HTTP routes to the auth service.
package handler

import (
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/halng/Oopsly/app/auth/internal/auth"
	"github.com/halng/Oopsly/app/auth/internal/httpx"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
	"github.com/halng/Oopsly/app/auth/internal/middleware"
)

const ContextPath = "/api/auth"

type Handler struct {
	Svc         *auth.Service
	Tokens      *jwtx.Manager
	InternalKey string
	Origins     []string
}

func (h *Handler) uid(c *gin.Context) string {
	p, _ := middleware.FromContext(c)
	return p.UserID
}

// Routes returns the Gin engine, mounted under the context path (health is also served at the root).
func (h *Handler) Routes() http.Handler {
	authn := middleware.Authenticate(h.Tokens)
	internal := middleware.InternalOnly(h.InternalKey)

	r := gin.New()
	r.Use(gin.Recovery(), httpx.CORS(h.Origins))

	health := func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "UP"}) }
	r.GET("/actuator/health", health)

	g := r.Group(ContextPath)
	g.GET("/actuator/health", health)

	// public
	g.POST("/v1/otp", h.createOTP)
	g.POST("/v1/otp/validate", h.validateOTP)
	g.POST("/v1/users/refresh-token", h.refreshToken)

	// authenticated
	g.POST("/v1/users/logout", authn, h.logout)
	g.GET("/v1/users/validate", authn, h.validate)
	g.GET("/v1/user-profiles", authn, h.getProfile)
	g.PATCH("/v1/user-profiles", authn, h.updateProfile)
	g.PATCH("/v1/user-profiles/settings", authn, h.updateSettings)
	g.PATCH("/v1/user-profiles/settings/newcomer", authn, h.newcomer)
	g.PATCH("/v1/user-profiles/profile/updates", authn, h.patchProfile)
	g.GET("/v1/subscriptions/me", authn, h.mySubscription)

	// service-to-service
	g.POST("/internal/v1/users/lookup", internal, h.lookup)
	g.PUT("/internal/v1/subscriptions/:userId", internal, h.setSubscription)

	return r
}

func (h *Handler) createOTP(c *gin.Context) {
	email := c.Query("email")
	if err := h.Svc.SendOTP(c.Request.Context(), email); err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "OTP sent successfully to "+email, nil)
}

func (h *Handler) validateOTP(c *gin.Context) {
	var raw struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
		Name  string `json:"name"`
	}
	if err := httpx.Decode(c, &raw); err != nil {
		httpx.Fail(c, err)
		return
	}
	res, err := h.Svc.VerifyOTP(c.Request.Context(), raw.Email, raw.OTP, raw.Name)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Authentication successful.", res)
}

func (h *Handler) refreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
		UserEmail    string `json:"user_email"`
	}
	if err := httpx.Decode(c, &req); err != nil {
		httpx.Fail(c, err)
		return
	}
	res, err := h.Svc.Refresh(c.Request.Context(), req.RefreshToken, req.UserEmail)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Token refreshed successfully", res)
}

func (h *Handler) logout(c *gin.Context) {
	if err := h.Svc.Logout(c.Request.Context(), h.uid(c)); err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Logged out successfully", nil)
}

func (h *Handler) validate(c *gin.Context) {
	if err := h.Svc.ValidateToken(c.Request.Context(), h.uid(c)); err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Token is valid", map[string]bool{"valid": true})
}

func (h *Handler) getProfile(c *gin.Context) {
	res, err := h.Svc.Profile(c.Request.Context(), h.uid(c))
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Profile retrieved successfully", res)
}

func (h *Handler) updateProfile(c *gin.Context) {
	var req auth.UpdateProfileReq
	if err := httpx.Decode(c, &req); err != nil {
		httpx.Fail(c, err)
		return
	}
	res, err := h.Svc.UpdateProfile(c.Request.Context(), h.uid(c), req)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Profile retrieved successfully", res)
}

func (h *Handler) updateSettings(c *gin.Context) {
	var req auth.UpdateSettingsReq
	if err := httpx.Decode(c, &req); err != nil {
		httpx.Fail(c, err)
		return
	}
	res, err := h.Svc.UpdateSettings(c.Request.Context(), h.uid(c), req)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Profile retrieved successfully", res)
}

func (h *Handler) newcomer(c *gin.Context) {
	if err := h.Svc.MarkNotNewComer(c.Request.Context(), h.uid(c)); err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Updated isNewComer status successfully", nil)
}

func (h *Handler) patchProfile(c *gin.Context) {
	if !strings.HasPrefix(c.GetHeader("Content-Type"), "application/json-patch+json") {
		httpx.Write(c, http.StatusUnsupportedMediaType, "Content-Type must be application/json-patch+json", nil)
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20))
	if err != nil {
		httpx.Fail(c, httpx.BadRequest("Invalid request body"))
		return
	}
	res, err := h.Svc.PatchProfile(c.Request.Context(), h.uid(c), body)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "User profile updated successfully", res)
}

func (h *Handler) mySubscription(c *gin.Context) {
	sub, err := h.Svc.Subscription(c.Request.Context(), h.uid(c))
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Subscription retrieved successfully", sub)
}

func (h *Handler) setSubscription(c *gin.Context) {
	var req auth.SetSubscriptionReq
	if err := httpx.Decode(c, &req); err != nil {
		httpx.Fail(c, err)
		return
	}
	sub, err := h.Svc.SetSubscription(c.Request.Context(), c.Param("userId"), req)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Subscription updated successfully", sub)
}

func (h *Handler) lookup(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := httpx.Decode(c, &req); err != nil {
		httpx.Fail(c, err)
		return
	}
	out, err := h.Svc.LookupUsers(c.Request.Context(), req.IDs)
	if err != nil {
		httpx.Fail(c, err)
		return
	}
	httpx.OK(c, "Users retrieved successfully", out)
}
