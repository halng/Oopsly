# Oopsly Auth

Go service that owns authentication, authorization, subscriptions, user profiles and access-token issuing.
`app/api` and `app/game` only verify the tokens it issues.

- Base URL: `http://localhost:9010/api/auth`
- Health: `GET /api/auth/actuator/health` (also `/actuator/health`)
- Tokens: HMAC (HS256/384/512 chosen by `JWT_SECRET` length, default key => HS384). Claims: `sub` (email), `id`, `role`, `plan`, `iat`, `exp`.

## Run

```bash
cd app
docker compose up -d --build     # postgres + redis + auth (app/docker-compose.yml)
# or, with Postgres/Redis already running:
cd auth && go run ./cmd/auth
go vet ./... && go test -race ./...
```

## Endpoints (`/api/auth`)

| Method | Path | Auth |
|---|---|---|
| POST | `/v1/otp?email=` , `/v1/otp/validate` | public |
| POST | `/v1/users/refresh-token` | public |
| POST | `/v1/users/logout`, GET `/v1/users/validate` | Bearer |
| GET/PATCH | `/v1/user-profiles`, PATCH `/v1/user-profiles/settings`, `/settings/newcomer` | Bearer |
| PATCH | `/v1/user-profiles/profile/updates` (`application/json-patch+json`; only name, displayName, bio, age, pictureUrl) | Bearer |
| GET | `/v1/subscriptions/me` | Bearer |
| PUT | `/internal/v1/subscriptions/{userId}` `{plan, expiresAt}` | `X-Internal-Key` |
| POST | `/internal/v1/users/lookup` `{ids:[...]}` (max 200) -> id, name, displayName, pictureUrl, dailyGoal | `X-Internal-Key` |

Responses use the same envelope as the Java API: `isSuccess, timestamp, message, statusCode, data`.
Plans: `FREE`, `PRO`, `PRO_PLUS`; an expired subscription is treated as `FREE`. Roles: `USER`, `ADMIN`.

## Configuration

`PORT` (9010), `DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD`, `REDIS_HOST/REDIS_PORT`, `JWT_SECRET` (Base64, must match api/game),
`JWT_EXPIRATION_MS`, `JWT_REFRESH_EXPIRATION_MS`, `TEST_EMAILS` (OTP `000000` bypass), `INTERNAL_API_KEY` (internal routes are rejected when unset),
`SMTP_HOST/SMTP_PORT/SMTP_USERNAME/SMTP_PASSWORD` (mail is a no-op with the `changeme` defaults or `APP_ENV=dev|test`), `ALLOWED_ORIGINS`.

## Data

Tables live in Postgres schema `auth` (`users`, `settings` = preferences only, `subscriptions`), migrated at startup from
`internal/store/migrations` under an advisory lock. Migration `001` copies existing rows from `public.users`/`public.settings`
once (same UUIDs) and never modifies `public.*`. Learning progress (xp, streak, league...) is owned by `app/api`.

`go.sum` is not committed yet: run `go mod tidy` once and commit it.
