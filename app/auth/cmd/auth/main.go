// Command auth runs the Oopsly authentication service.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/halng/Oopsly/app/auth/internal/auth"
	"github.com/halng/Oopsly/app/auth/internal/config"
	"github.com/halng/Oopsly/app/auth/internal/handler"
	"github.com/halng/Oopsly/app/auth/internal/jwtx"
	"github.com/halng/Oopsly/app/auth/internal/kv"
	"github.com/halng/Oopsly/app/auth/internal/mail"
	"github.com/halng/Oopsly/app/auth/internal/otp"
	"github.com/halng/Oopsly/app/auth/internal/store"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	if err := run(); err != nil {
		slog.Error("auth service stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg := config.Load(os.Getenv)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, cfg.DBURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := store.Migrate(ctx, pool); err != nil {
		return err
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	defer rdb.Close()
	kvs := kv.Redis{C: rdb}

	tokens, err := jwtx.NewManager(cfg.JWTSecret, cfg.AccessTTL, cfg.RefreshTTL)
	if err != nil {
		return err
	}
	var sender mail.Sender = mail.SMTP{Host: cfg.SMTPHost, Port: cfg.SMTPPort, Username: cfg.SMTPUsername, Password: cfg.SMTPPassword}
	if cfg.NoOpMail() {
		sender = mail.NoOp{}
	}

	gin.SetMode(gin.ReleaseMode)
	svc := auth.New(store.Postgres{Pool: pool}, kvs, tokens, otp.New(kvs, cfg.TestEmails), sender)
	h := &handler.Handler{Svc: svc, Tokens: tokens, InternalKey: cfg.InternalKey, Origins: cfg.AllowedOrigins}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           h.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
	}
	errc := make(chan error, 1)
	go func() { errc <- srv.ListenAndServe() }()
	slog.Info("auth service listening", "port", cfg.Port, "contextPath", handler.ContextPath)

	select {
	case err := <-errc:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdown)
	}
	return nil
}
