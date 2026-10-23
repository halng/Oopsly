// Package httpx holds the response envelope shared with the Java API and small HTTP helpers.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Res mirrors the Java Res record: isSuccess, timestamp, message, statusCode, data.
type Res struct {
	IsSuccess  bool      `json:"isSuccess"`
	Timestamp  time.Time `json:"timestamp"`
	Message    string    `json:"message"`
	StatusCode int       `json:"statusCode"`
	Data       any       `json:"data"`
}

// Error is an expected failure carrying the HTTP status to answer with.
type Error struct {
	Status  int
	Message string
}

func (e *Error) Error() string { return e.Message }

func Errf(status int, msg string) *Error { return &Error{Status: status, Message: msg} }

func BadRequest(msg string) *Error   { return Errf(http.StatusBadRequest, msg) }
func Unauthorized(msg string) *Error { return Errf(http.StatusUnauthorized, msg) }
func Forbidden(msg string) *Error    { return Errf(http.StatusForbidden, msg) }
func NotFound(msg string) *Error     { return Errf(http.StatusNotFound, msg) }

// Write sends the envelope with the given status and stops the handler chain.
func Write(c *gin.Context, status int, message string, data any) {
	c.AbortWithStatusJSON(status, Res{
		IsSuccess:  status < 400,
		Timestamp:  time.Now().UTC(),
		Message:    message,
		StatusCode: status,
		Data:       data,
	})
}

func OK(c *gin.Context, message string, data any) { Write(c, http.StatusOK, message, data) }

// Fail maps err to the envelope; unexpected errors become a generic 500.
func Fail(c *gin.Context, err error) {
	var he *Error
	if errors.As(err, &he) {
		Write(c, he.Status, he.Message, nil)
		return
	}
	slog.Error("unhandled error", "err", err)
	Write(c, http.StatusInternalServerError, "Internal server error", nil)
}

// Decode reads a JSON body, rejecting empty or malformed input.
func Decode(c *gin.Context, v any) error {
	if c.Request.Body == nil {
		return BadRequest("Request body is required")
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20)
	if err := json.NewDecoder(c.Request.Body).Decode(v); err != nil {
		return BadRequest("Invalid request body")
	}
	return nil
}

// CORS answers preflight requests and sets CORS headers for allowed origins ("*" allows all).
func CORS(origins []string) gin.HandlerFunc {
	allowAll := false
	allowed := map[string]bool{}
	for _, o := range origins {
		if o == "*" {
			allowAll = true
		}
		allowed[o] = true
	}
	return func(c *gin.Context) {
		h := c.Writer.Header()
		if o := c.GetHeader("Origin"); o != "" && (allowAll || allowed[o]) {
			if allowAll {
				h.Set("Access-Control-Allow-Origin", "*")
			} else {
				h.Set("Access-Control-Allow-Origin", o)
				h.Add("Vary", "Origin")
			}
			h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "*")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// BearerToken extracts the token from an Authorization header.
func BearerToken(c *gin.Context) (string, bool) {
	h := c.GetHeader("Authorization")
	if len(h) > 7 && strings.EqualFold(h[:7], "bearer ") {
		return h[7:], true
	}
	return "", false
}
