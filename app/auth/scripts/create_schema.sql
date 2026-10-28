-- Creates the `auth` schema owned by the auth service (app.db.AUTH_SCHEMA).
-- Alembic also does this on `alembic upgrade head`; run this script as a privileged role
-- when the application role is not allowed to create schemas.
--
--   psql "$DATABASE_URL" -v app_user=oopsly_auth -f scripts/create_schema.sql

CREATE SCHEMA IF NOT EXISTS auth;

-- Let the application role run the migrations and own the tables it creates.
GRANT USAGE, CREATE ON SCHEMA auth TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
