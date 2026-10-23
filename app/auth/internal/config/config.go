// Package config loads service settings from the environment.
package config

import (
	"strconv"
	"strings"
	"time"
)

const defaultJWTSecret = "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"

type Config struct {
	Env            string
	Port           string
	DBURL          string
	RedisAddr      string
	JWTSecret      string
	AccessTTL      time.Duration
	RefreshTTL     time.Duration
	TestEmails     []string
	InternalKey    string
	SMTPHost       string
	SMTPPort       string
	SMTPUsername   string
	SMTPPassword   string
	AllowedOrigins []string
}

// Load reads the configuration; getenv is injectable for tests.
func Load(getenv func(string) string) Config {
	get := func(k, def string) string {
		if v := getenv(k); v != "" {
			return v
		}
		return def
	}
	ms := func(k string, def int64) time.Duration {
		if v, err := strconv.ParseInt(getenv(k), 10, 64); err == nil && v > 0 {
			return time.Duration(v) * time.Millisecond
		}
		return time.Duration(def) * time.Millisecond
	}
	dbURL := "postgres://" + get("DB_USERNAME", "postgres") + ":" + urlEscape(get("DB_PASSWORD", "postgres")) +
		"@" + get("DB_HOST", "localhost") + ":" + get("DB_PORT", "5432") + "/" + get("DB_NAME", "oopsly")
	return Config{
		Env:            get("APP_ENV", ""),
		Port:           get("PORT", "9010"),
		DBURL:          dbURL,
		RedisAddr:      get("REDIS_HOST", "localhost") + ":" + get("REDIS_PORT", "6379"),
		JWTSecret:      get("JWT_SECRET", defaultJWTSecret),
		AccessTTL:      ms("JWT_EXPIRATION_MS", 86400000),
		RefreshTTL:     ms("JWT_REFRESH_EXPIRATION_MS", 604800000),
		TestEmails:     splitList(getenv("TEST_EMAILS")),
		InternalKey:    getenv("INTERNAL_API_KEY"),
		SMTPHost:       get("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:       get("SMTP_PORT", "587"),
		SMTPUsername:   get("SMTP_USERNAME", "changeme@gmail.com"),
		SMTPPassword:   get("SMTP_PASSWORD", "changeme"),
		AllowedOrigins: splitList(get("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8081")),
	}
}

// NoOpMail reports whether real email delivery should be skipped.
func (c Config) NoOpMail() bool {
	return c.Env == "test" || c.Env == "dev" || c.SMTPPassword == "changeme" || c.SMTPUsername == "changeme@gmail.com"
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func urlEscape(s string) string {
	r := strings.NewReplacer("%", "%25", "@", "%40", ":", "%3A", "/", "%2F", "?", "%3F", "#", "%23", " ", "%20")
	return r.Replace(s)
}
