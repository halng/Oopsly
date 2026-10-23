package store

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pashagolub/pgxmock/v4"
)

func migrationNames(t *testing.T) []string {
	t.Helper()
	entries, err := migrationFS.ReadDir("migrations")
	if err != nil || len(entries) == 0 {
		t.Fatalf("no embedded migrations: %v", err)
	}
	names := make([]string, len(entries))
	for i, e := range entries {
		names[i] = e.Name()
	}
	return names
}

func expectPrelude(m pgxmock.PgxPoolIface) {
	m.ExpectExec("pg_advisory_lock").WithArgs(anyArgs(1)...).WillReturnResult(pgxmock.NewResult("SELECT", 1))
	m.ExpectExec("CREATE SCHEMA IF NOT EXISTS auth").WillReturnResult(pgxmock.NewResult("CREATE", 0))
	m.ExpectExec("CREATE TABLE IF NOT EXISTS auth.schema_migrations").WillReturnResult(pgxmock.NewResult("CREATE", 0))
}

func expectUnlock(m pgxmock.PgxPoolIface) {
	m.ExpectExec("pg_advisory_unlock").WithArgs(anyArgs(1)...).WillReturnResult(pgxmock.NewResult("SELECT", 1))
}

func exists(v bool) *pgxmock.Rows { return pgxmock.NewRows([]string{"exists"}).AddRow(v) }

func newPool(t *testing.T) pgxmock.PgxPoolIface {
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
	return m
}

func TestRunMigrationsAppliesPending(t *testing.T) {
	m := newPool(t)
	expectPrelude(m)
	for range migrationNames(t) {
		m.ExpectQuery("auth.schema_migrations WHERE version").WithArgs(anyArgs(1)...).WillReturnRows(exists(false))
		m.ExpectBegin()
		m.ExpectExec(".").WillReturnResult(pgxmock.NewResult("CREATE", 0))
		m.ExpectExec("INSERT INTO auth.schema_migrations").WithArgs(anyArgs(1)...).WillReturnResult(pgxmock.NewResult("INSERT", 1))
		m.ExpectCommit()
	}
	expectUnlock(m)
	if err := runMigrations(context.Background(), m); err != nil {
		t.Fatal(err)
	}
}

func TestRunMigrationsSkipsApplied(t *testing.T) {
	m := newPool(t)
	expectPrelude(m)
	for range migrationNames(t) {
		m.ExpectQuery("auth.schema_migrations WHERE version").WithArgs(anyArgs(1)...).WillReturnRows(exists(true))
	}
	expectUnlock(m)
	if err := runMigrations(context.Background(), m); err != nil {
		t.Fatal(err)
	}
}

func TestRunMigrationsFailures(t *testing.T) {
	boom := errors.New("boom")
	tests := []struct {
		name   string
		expect func(m pgxmock.PgxPoolIface)
	}{
		{"lock", func(m pgxmock.PgxPoolIface) {
			m.ExpectExec("pg_advisory_lock").WithArgs(anyArgs(1)...).WillReturnError(boom)
		}},
		{"schema", func(m pgxmock.PgxPoolIface) {
			m.ExpectExec("pg_advisory_lock").WithArgs(anyArgs(1)...).WillReturnResult(pgxmock.NewResult("SELECT", 1))
			m.ExpectExec("CREATE SCHEMA").WillReturnError(boom)
			expectUnlock(m)
		}},
		{"tracking table", func(m pgxmock.PgxPoolIface) {
			m.ExpectExec("pg_advisory_lock").WithArgs(anyArgs(1)...).WillReturnResult(pgxmock.NewResult("SELECT", 1))
			m.ExpectExec("CREATE SCHEMA").WillReturnResult(pgxmock.NewResult("CREATE", 0))
			m.ExpectExec("CREATE TABLE IF NOT EXISTS auth.schema_migrations").WillReturnError(boom)
			expectUnlock(m)
		}},
		{"check applied", func(m pgxmock.PgxPoolIface) {
			expectPrelude(m)
			m.ExpectQuery("auth.schema_migrations WHERE version").WithArgs(anyArgs(1)...).WillReturnError(boom)
			expectUnlock(m)
		}},
		{"begin", func(m pgxmock.PgxPoolIface) {
			expectPrelude(m)
			m.ExpectQuery("auth.schema_migrations WHERE version").WithArgs(anyArgs(1)...).WillReturnRows(exists(false))
			m.ExpectBegin().WillReturnError(boom)
			expectUnlock(m)
		}},
		{"migration sql", func(m pgxmock.PgxPoolIface) {
			expectPrelude(m)
			m.ExpectQuery("auth.schema_migrations WHERE version").WithArgs(anyArgs(1)...).WillReturnRows(exists(false))
			m.ExpectBegin()
			m.ExpectExec(".").WillReturnError(boom)
			m.ExpectRollback()
			expectUnlock(m)
		}},
		{"record version", func(m pgxmock.PgxPoolIface) {
			expectPrelude(m)
			m.ExpectQuery("auth.schema_migrations WHERE version").WithArgs(anyArgs(1)...).WillReturnRows(exists(false))
			m.ExpectBegin()
			m.ExpectExec(".").WillReturnResult(pgxmock.NewResult("CREATE", 0))
			m.ExpectExec("INSERT INTO auth.schema_migrations").WithArgs(anyArgs(1)...).WillReturnError(boom)
			m.ExpectRollback()
			expectUnlock(m)
		}},
		{"commit", func(m pgxmock.PgxPoolIface) {
			expectPrelude(m)
			m.ExpectQuery("auth.schema_migrations WHERE version").WithArgs(anyArgs(1)...).WillReturnRows(exists(false))
			m.ExpectBegin()
			m.ExpectExec(".").WillReturnResult(pgxmock.NewResult("CREATE", 0))
			m.ExpectExec("INSERT INTO auth.schema_migrations").WithArgs(anyArgs(1)...).WillReturnResult(pgxmock.NewResult("INSERT", 1))
			m.ExpectCommit().WillReturnError(boom)
			expectUnlock(m)
		}},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			m := newPool(t)
			tc.expect(m)
			if err := runMigrations(context.Background(), m); !errors.Is(err, boom) {
				t.Fatalf("err = %v", err)
			}
		})
	}
}

func TestMigrateReportsUnreachableDatabase(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://u:p@127.0.0.1:1/db?connect_timeout=1")
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := Migrate(ctx, pool); err == nil {
		t.Fatal("Migrate must fail when the database is unreachable")
	}
}
