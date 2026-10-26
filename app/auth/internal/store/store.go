// Package store persists auth data in Postgres (schema "auth").
package store

import (
	"context"
	"errors"

	"github.com/halng/Oopsly/app/auth/internal/domain"
)

var ErrNotFound = errors.New("not found")

type Store interface {
	FindUserByEmail(ctx context.Context, email string) (*domain.User, error)
	FindUserByID(ctx context.Context, id string) (*domain.User, error)
	// CreateUser inserts the user and a FREE subscription; an existing email returns the existing user.
	CreateUser(ctx context.Context, email, name string) (*domain.User, error)
	UpdateUser(ctx context.Context, u *domain.User) error
	GetSettings(ctx context.Context, userID string) (*domain.Settings, error)
	SaveSettings(ctx context.Context, s *domain.Settings) error
	GetSubscription(ctx context.Context, userID string) (*domain.Subscription, error)
	SaveSubscription(ctx context.Context, s *domain.Subscription) error
	LookupUsers(ctx context.Context, ids []string) ([]domain.UserLookup, error)
}
