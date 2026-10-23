package store

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/halng/Oopsly/app/auth/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/pashagolub/pgxmock/v4"
)

const uid = "11111111-1111-1111-1111-111111111111"

var errBoom = errors.New("boom")

// anyArgs matches n arguments of any value (pgxmock checks the argument count).
func anyArgs(n int) []any {
	out := make([]any, n)
	for i := range out {
		out[i] = pgxmock.AnyArg()
	}
	return out
}

func newMock(t *testing.T) (pgxmock.PgxPoolIface, Postgres) {
	t.Helper()
	m, err := pgxmock.NewPool()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := m.ExpectationsWereMet(); err != nil {
			t.Errorf("unmet expectations: %v", err)
		}
	})
	return m, Postgres{Pool: m}
}

var userRowCols = []string{"id", "email", "name", "display_name", "picture_url", "bio", "age", "role"}

func TestFindUser(t *testing.T) {
	ctx := context.Background()
	age := 30
	m, db := newMock(t)

	m.ExpectQuery("lower\\(email\\)").WithArgs("a@b.co").
		WillReturnRows(pgxmock.NewRows(userRowCols).AddRow(uid, "a@b.co", "Ann", "Annie", "pic", "bio", &age, "USER"))
	u, err := db.FindUserByEmail(ctx, "a@b.co")
	if err != nil || u.ID != uid || u.DisplayName != "Annie" || u.Age == nil || *u.Age != 30 {
		t.Fatalf("FindUserByEmail = %+v, %v", u, err)
	}

	m.ExpectQuery("id = \\$1::uuid").WithArgs(uid).
		WillReturnRows(pgxmock.NewRows(userRowCols).AddRow(uid, "a@b.co", "Ann", "Annie", "", "", (*int)(nil), "ADMIN"))
	u, err = db.FindUserByID(ctx, uid)
	if err != nil || u.Role != "ADMIN" || u.Age != nil {
		t.Fatalf("FindUserByID = %+v, %v", u, err)
	}

	m.ExpectQuery("auth.users").WithArgs(anyArgs(1)...).WillReturnError(pgx.ErrNoRows)
	if _, err := db.FindUserByID(ctx, uid); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing user err = %v", err)
	}
	m.ExpectQuery("auth.users").WithArgs(anyArgs(1)...).WillReturnError(errBoom)
	if _, err := db.FindUserByEmail(ctx, "x"); !errors.Is(err, errBoom) {
		t.Fatalf("db error = %v", err)
	}
}

func TestCreateUser(t *testing.T) {
	ctx := context.Background()
	idRow := func() *pgxmock.Rows { return pgxmock.NewRows([]string{"id"}).AddRow(uid) }

	t.Run("ok", func(t *testing.T) {
		m, db := newMock(t)
		m.ExpectBegin()
		m.ExpectQuery("INSERT INTO auth.users").WithArgs("a@b.co", "Ann").WillReturnRows(idRow())
		m.ExpectExec("INSERT INTO auth.subscriptions").WithArgs(uid).WillReturnResult(pgxmock.NewResult("INSERT", 1))
		m.ExpectCommit()
		m.ExpectQuery("id = \\$1::uuid").WithArgs(uid).
			WillReturnRows(pgxmock.NewRows(userRowCols).AddRow(uid, "a@b.co", "Ann", "Ann", "", "", (*int)(nil), "USER"))
		u, err := db.CreateUser(ctx, "a@b.co", "Ann")
		if err != nil || u.ID != uid {
			t.Fatalf("CreateUser = %+v, %v", u, err)
		}
	})
	t.Run("begin fails", func(t *testing.T) {
		m, db := newMock(t)
		m.ExpectBegin().WillReturnError(errBoom)
		if _, err := db.CreateUser(ctx, "a", "b"); !errors.Is(err, errBoom) {
			t.Fatalf("err = %v", err)
		}
	})
	t.Run("insert user fails", func(t *testing.T) {
		m, db := newMock(t)
		m.ExpectBegin()
		m.ExpectQuery("INSERT INTO auth.users").WithArgs(anyArgs(2)...).WillReturnError(errBoom)
		m.ExpectRollback()
		if _, err := db.CreateUser(ctx, "a", "b"); !errors.Is(err, errBoom) {
			t.Fatalf("err = %v", err)
		}
	})
	t.Run("insert subscription fails", func(t *testing.T) {
		m, db := newMock(t)
		m.ExpectBegin()
		m.ExpectQuery("INSERT INTO auth.users").WithArgs(anyArgs(2)...).WillReturnRows(idRow())
		m.ExpectExec("INSERT INTO auth.subscriptions").WithArgs(anyArgs(1)...).WillReturnError(errBoom)
		m.ExpectRollback()
		if _, err := db.CreateUser(ctx, "a", "b"); !errors.Is(err, errBoom) {
			t.Fatalf("err = %v", err)
		}
	})
	t.Run("commit fails", func(t *testing.T) {
		m, db := newMock(t)
		m.ExpectBegin()
		m.ExpectQuery("INSERT INTO auth.users").WithArgs(anyArgs(2)...).WillReturnRows(idRow())
		m.ExpectExec("INSERT INTO auth.subscriptions").WithArgs(anyArgs(1)...).WillReturnResult(pgxmock.NewResult("INSERT", 1))
		m.ExpectCommit().WillReturnError(errBoom)
		m.ExpectRollback()
		if _, err := db.CreateUser(ctx, "a", "b"); !errors.Is(err, errBoom) {
			t.Fatalf("err = %v", err)
		}
	})
}

func TestUpdateUser(t *testing.T) {
	ctx := context.Background()
	age := 20
	u := &domain.User{ID: uid, Name: "n", DisplayName: "d", PictureURL: "p", Bio: "b", Age: &age}
	m, db := newMock(t)

	m.ExpectExec("UPDATE auth.users").WithArgs(uid, "n", "d", "p", "b", &age).WillReturnResult(pgxmock.NewResult("UPDATE", 1))
	if err := db.UpdateUser(ctx, u); err != nil {
		t.Fatal(err)
	}
	m.ExpectExec("UPDATE auth.users").WithArgs(anyArgs(6)...).WillReturnResult(pgxmock.NewResult("UPDATE", 0))
	if err := db.UpdateUser(ctx, u); !errors.Is(err, ErrNotFound) {
		t.Fatalf("no rows err = %v", err)
	}
	m.ExpectExec("UPDATE auth.users").WithArgs(anyArgs(6)...).WillReturnError(errBoom)
	if err := db.UpdateUser(ctx, u); !errors.Is(err, errBoom) {
		t.Fatalf("db err = %v", err)
	}
}

func TestSettings(t *testing.T) {
	ctx := context.Background()
	cols := []string{"user_id", "theme", "language", "daily_goal", "target_retention_rate",
		"sound_effects_enabled", "haptic_feedback_enabled", "auto_play_audio", "allow_reminders", "is_new_comer"}
	m, db := newMock(t)

	m.ExpectQuery("FROM auth.settings").WithArgs(uid).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(uid, "DARK", "ENGLISH", 33, 0.9, true, false, true, false, true))
	s, err := db.GetSettings(ctx, uid)
	if err != nil || s.Theme != "DARK" || s.DailyGoal != 33 || s.HapticFeedback {
		t.Fatalf("GetSettings = %+v, %v", s, err)
	}
	m.ExpectQuery("FROM auth.settings").WithArgs(anyArgs(1)...).WillReturnError(pgx.ErrNoRows)
	if _, err := db.GetSettings(ctx, uid); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing settings err = %v", err)
	}
	m.ExpectQuery("FROM auth.settings").WithArgs(anyArgs(1)...).WillReturnError(errBoom)
	if _, err := db.GetSettings(ctx, uid); !errors.Is(err, errBoom) {
		t.Fatalf("db err = %v", err)
	}

	in := domain.DefaultSettings(uid)
	m.ExpectExec("INSERT INTO auth.settings").
		WithArgs(uid, in.Theme, in.Language, in.DailyGoal, in.TargetRetentionRate,
			in.SoundEffects, in.HapticFeedback, in.AutoPlayAudio, in.AllowReminders, in.IsNewComer).
		WillReturnResult(pgxmock.NewResult("INSERT", 1))
	if err := db.SaveSettings(ctx, in); err != nil {
		t.Fatal(err)
	}
	m.ExpectExec("INSERT INTO auth.settings").WithArgs(anyArgs(10)...).WillReturnError(errBoom)
	if err := db.SaveSettings(ctx, in); !errors.Is(err, errBoom) {
		t.Fatalf("save err = %v", err)
	}
}

func TestSubscription(t *testing.T) {
	ctx := context.Background()
	exp := time.Now().Add(time.Hour)
	m, db := newMock(t)

	m.ExpectQuery("FROM auth.subscriptions").WithArgs(uid).
		WillReturnRows(pgxmock.NewRows([]string{"user_id", "plan", "status", "expires_at"}).
			AddRow(uid, "PRO", "ACTIVE", &exp))
	s, err := db.GetSubscription(ctx, uid)
	if err != nil || s.Plan != "PRO" || s.ExpiresAt == nil {
		t.Fatalf("GetSubscription = %+v, %v", s, err)
	}
	m.ExpectQuery("FROM auth.subscriptions").WithArgs(anyArgs(1)...).WillReturnError(pgx.ErrNoRows)
	if _, err := db.GetSubscription(ctx, uid); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing sub err = %v", err)
	}
	m.ExpectQuery("FROM auth.subscriptions").WithArgs(anyArgs(1)...).WillReturnError(errBoom)
	if _, err := db.GetSubscription(ctx, uid); !errors.Is(err, errBoom) {
		t.Fatalf("db err = %v", err)
	}

	in := &domain.Subscription{UserID: uid, Plan: "PRO", Status: "ACTIVE", ExpiresAt: &exp}
	m.ExpectExec("INSERT INTO auth.subscriptions").WithArgs(uid, "PRO", "ACTIVE", &exp).
		WillReturnResult(pgxmock.NewResult("INSERT", 1))
	if err := db.SaveSubscription(ctx, in); err != nil {
		t.Fatal(err)
	}
	m.ExpectExec("INSERT INTO auth.subscriptions").WithArgs(anyArgs(4)...).WillReturnError(errBoom)
	if err := db.SaveSubscription(ctx, in); !errors.Is(err, errBoom) {
		t.Fatalf("save err = %v", err)
	}
}

func TestLookupUsers(t *testing.T) {
	ctx := context.Background()
	cols := []string{"id", "name", "display_name", "picture_url", "daily_goal"}
	m, db := newMock(t)

	m.ExpectQuery("LEFT JOIN auth.settings").WithArgs([]string{uid, "x"}).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(uid, "Ann", "Annie", "p", 25))
	out, err := db.LookupUsers(ctx, []string{uid, "x"})
	if err != nil || len(out) != 1 || out[0].DailyGoal != 25 {
		t.Fatalf("LookupUsers = %+v, %v", out, err)
	}

	m.ExpectQuery("LEFT JOIN auth.settings").WithArgs(anyArgs(1)...).WillReturnError(errBoom)
	if _, err := db.LookupUsers(ctx, nil); !errors.Is(err, errBoom) {
		t.Fatalf("query err = %v", err)
	}

	// a row that cannot be scanned into the destination types
	m.ExpectQuery("LEFT JOIN auth.settings").WithArgs(anyArgs(1)...).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(uid, "Ann", "Annie", "p", "not-an-int"))
	if _, err := db.LookupUsers(ctx, nil); err == nil {
		t.Fatal("expected scan error")
	}

	m.ExpectQuery("LEFT JOIN auth.settings").WithArgs(anyArgs(1)...).
		WillReturnRows(pgxmock.NewRows(cols).AddRow(uid, "Ann", "Annie", "p", 25).RowError(0, errBoom))
	if _, err := db.LookupUsers(ctx, nil); err == nil {
		t.Fatal("expected rows error")
	}
}
