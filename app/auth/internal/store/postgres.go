package store

import (
	"context"
	"errors"

	"github.com/halng/Oopsly/app/auth/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DB is the subset of pgx used here; *pgxpool.Pool, *pgxpool.Conn and pgxmock satisfy it.
type DB interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Begin(ctx context.Context) (pgx.Tx, error)
}

type Postgres struct{ Pool DB }

const userCols = `id::text, email, COALESCE(name,''), COALESCE(display_name,''), COALESCE(picture_url,''), COALESCE(bio,''), age, role`

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.DisplayName, &u.PictureURL, &u.Bio, &u.Age, &u.Role)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &u, err
}

func (p Postgres) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	return scanUser(p.Pool.QueryRow(ctx, `SELECT `+userCols+` FROM auth.users WHERE lower(email) = lower($1) AND NOT deleted`, email))
}

func (p Postgres) FindUserByID(ctx context.Context, id string) (*domain.User, error) {
	return scanUser(p.Pool.QueryRow(ctx, `SELECT `+userCols+` FROM auth.users WHERE id = $1::uuid AND NOT deleted`, id))
}

func (p Postgres) CreateUser(ctx context.Context, email, name string) (*domain.User, error) {
	tx, err := p.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO auth.users (email, name, display_name) VALUES ($1, $2, $2)
		ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id::text`, email, name).Scan(&id)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO auth.subscriptions (user_id) VALUES ($1::uuid) ON CONFLICT DO NOTHING`, id); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return p.FindUserByID(ctx, id)
}

func (p Postgres) UpdateUser(ctx context.Context, u *domain.User) error {
	tag, err := p.Pool.Exec(ctx, `UPDATE auth.users SET name=$2, display_name=$3, picture_url=$4, bio=$5, age=$6, updated_at=now()
		WHERE id=$1::uuid`, u.ID, u.Name, u.DisplayName, u.PictureURL, u.Bio, u.Age)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

func (p Postgres) GetSettings(ctx context.Context, userID string) (*domain.Settings, error) {
	var s domain.Settings
	err := p.Pool.QueryRow(ctx, `SELECT user_id::text, theme, language, daily_goal, target_retention_rate,
		sound_effects_enabled, haptic_feedback_enabled, auto_play_audio, allow_reminders, is_new_comer
		FROM auth.settings WHERE user_id = $1::uuid`, userID).
		Scan(&s.UserID, &s.Theme, &s.Language, &s.DailyGoal, &s.TargetRetentionRate,
			&s.SoundEffects, &s.HapticFeedback, &s.AutoPlayAudio, &s.AllowReminders, &s.IsNewComer)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &s, err
}

func (p Postgres) SaveSettings(ctx context.Context, s *domain.Settings) error {
	_, err := p.Pool.Exec(ctx, `INSERT INTO auth.settings (user_id, theme, language, daily_goal, target_retention_rate,
		sound_effects_enabled, haptic_feedback_enabled, auto_play_audio, allow_reminders, is_new_comer)
		VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (user_id) DO UPDATE SET theme=EXCLUDED.theme, language=EXCLUDED.language, daily_goal=EXCLUDED.daily_goal,
		target_retention_rate=EXCLUDED.target_retention_rate, sound_effects_enabled=EXCLUDED.sound_effects_enabled,
		haptic_feedback_enabled=EXCLUDED.haptic_feedback_enabled, auto_play_audio=EXCLUDED.auto_play_audio,
		allow_reminders=EXCLUDED.allow_reminders, is_new_comer=EXCLUDED.is_new_comer, updated_at=now()`,
		s.UserID, s.Theme, s.Language, s.DailyGoal, s.TargetRetentionRate,
		s.SoundEffects, s.HapticFeedback, s.AutoPlayAudio, s.AllowReminders, s.IsNewComer)
	return err
}

func (p Postgres) GetSubscription(ctx context.Context, userID string) (*domain.Subscription, error) {
	var s domain.Subscription
	err := p.Pool.QueryRow(ctx, `SELECT user_id::text, plan, status, expires_at FROM auth.subscriptions WHERE user_id = $1::uuid`, userID).
		Scan(&s.UserID, &s.Plan, &s.Status, &s.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return &s, err
}

func (p Postgres) SaveSubscription(ctx context.Context, s *domain.Subscription) error {
	_, err := p.Pool.Exec(ctx, `INSERT INTO auth.subscriptions (user_id, plan, status, expires_at) VALUES ($1::uuid,$2,$3,$4)
		ON CONFLICT (user_id) DO UPDATE SET plan=EXCLUDED.plan, status=EXCLUDED.status, expires_at=EXCLUDED.expires_at,
		started_at = CASE WHEN auth.subscriptions.plan <> EXCLUDED.plan THEN now() ELSE auth.subscriptions.started_at END`,
		s.UserID, s.Plan, s.Status, s.ExpiresAt)
	return err
}

func (p Postgres) LookupUsers(ctx context.Context, ids []string) ([]domain.UserLookup, error) {
	rows, err := p.Pool.Query(ctx, `SELECT u.id::text, COALESCE(u.name,''), COALESCE(u.display_name,''), COALESCE(u.picture_url,''),
		COALESCE(s.daily_goal, 20) FROM auth.users u LEFT JOIN auth.settings s ON s.user_id = u.id
		WHERE u.id::text = ANY($1::text[]) AND NOT u.deleted`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.UserLookup{}
	for rows.Next() {
		var l domain.UserLookup
		if err := rows.Scan(&l.ID, &l.Name, &l.DisplayName, &l.PictureURL, &l.DailyGoal); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}
