# Oopsly Auth

Python (FastAPI) service that owns authentication, authorization, subscriptions, user profiles and access-token issuing.
`app/api` and `app/game` only verify the tokens it issues, using the public keys it publishes.

- Base URL: `http://localhost:9010/api/auth`
- Health: `GET /api/auth/actuator/health` (also `/actuator/health`)
- Swagger: `http://localhost:9010/api/auth/docs`
- Tokens: **RS256**, header `kid`. Claims: `sub` (email), `id`, `role`, `plan`, `iat`, `exp`.
- JWKS: `GET /.well-known/pub.json` (also `/api/auth/.well-known/pub.json`)

## Run

```bash
cd app
docker compose up -d --build     # postgres + redis + auth (app/docker-compose.yml)
# or, with Postgres/Redis already running:
cd auth
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --port 9010
ruff check . && ruff format --check . && python -m pytest -q --cov=app   # fails below 95% coverage
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
| GET | `/v1/features`, `/v1/features/{key}` -> `{enabled, source}` per feature (see Feature toggles) | optional Bearer |
| PUT | `/internal/v1/subscriptions/{userId}` `{plan, expiresAt}` | `X-Internal-Key` |
| POST | `/internal/v1/users/lookup` `{ids:[...]}` (max 200) -> id, name, displayName, pictureUrl, dailyGoal | `X-Internal-Key` |
| GET | `/.well-known/pub.json` | public |

Responses use the same envelope as the Java API: `isSuccess, timestamp, message, statusCode, data`
(the JWKS is the plain RFC 7517 document). Plans: `FREE`, `PRO`, `PRO_PLUS`; an expired subscription is treated as `FREE`.
Roles: `USER`, `ADMIN`.

## Signing keys and JWKS

- Access and refresh tokens are signed with an RSA-2048 key (RS256). The private key never leaves this service;
  it lives in `auth.signing_keys` (encrypted with `JWT_KEY_PASSPHRASE` when set).
- The `kid` is the RFC 7638 thumbprint of the public key.
- **Weekly rotation** (`JWT_KEY_ROTATION_DAYS`, default 7). Each key signs for one interval. The *next* key is created and
  published `JWT_KEY_PUBLISH_LEAD_HOURS` (default 24h) before it starts signing, so verifier caches already know it.
  A retired key stays in the JWKS until its last token has expired (longest token TTL + 1h).
- Rotation runs at startup, hourly in the background, and lazily on token issue. A Postgres advisory lock plus a unique
  `activate_at` make it safe with several instances.
- `GET /.well-known/pub.json` returns every key whose tokens may still be valid, with `Cache-Control: public, max-age=300`.

### Verifying (api, game)

A verifier holds the JWKS in memory and:

1. fetches it on the first request that needs a key;
2. checks the token header: `alg` must be `RS256`, then looks up `kid`;
3. when the `kid` is not cached, refetches the JWKS (throttled to once per 30s so random `kid`s cannot hammer this service)
   and retries once; if the refetch fails it keeps using what it has.

Point them at the service with `JWKS_URL` (default `http://localhost:9010/.well-known/pub.json`).

## Configuration

`PORT` (9010), `DATABASE_URL` or `DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD`, `REDIS_HOST/REDIS_PORT`,
`JWT_EXPIRATION_MS`, `JWT_REFRESH_EXPIRATION_MS`, `JWT_KEY_PASSPHRASE`, `JWT_KEY_ROTATION_DAYS`,
`JWT_KEY_PUBLISH_LEAD_HOURS`, `JWT_KEY_ROTATION_CHECK_SECONDS`, `TEST_EMAILS` (OTP `000000` bypass),
`INTERNAL_API_KEY` (internal routes are rejected when unset), `ALLOWED_ORIGINS`.

**Email is not sent yet** (`NoOpSender` only logs). Until Resend is wired up in `deps.get_sender`, only `TEST_EMAILS` can sign in (code `000000`).

`JWT_SECRET` is gone: nothing shares a secret any more.

## Logs

Console logs use the API's logback layout: `2026-10-28 10:20:31,512 INFO  [MainThread] [WEB:01J...] app.main - Request: POST /api/auth/v1/otp/validate | Status: 200 | 41 ms`.
`X-Request-ID` (generated when missing) and `X-Platform` are bound to every line of a request. Emails are masked
(`h***@example.com`); OTP codes and tokens are never logged.

## Data

Tables live in Postgres schema `auth` (`users`, `settings` = preferences only, `subscriptions`, `signing_keys`), migrated
with Alembic (`alembic upgrade head`, run by the container on start under an advisory lock). Migration `001` is idempotent:
it adopts the tables the previous Go service created and copies existing rows from `public.users`/`public.settings` once
(same UUIDs); it never modifies `public.*`. Learning progress (xp, streak, league...) is owned by `app/api`.

## Cutover from the Go service

- Same port, context path, endpoints, envelope and Redis keys (`otp:*`, `refresh_token:*`), so clients keep working.
- Every token signed with the old shared secret stops verifying once `api` and `game` move to JWKS: users log in again.
  Deploy order: auth first, then api and game with `JWKS_URL` set.

## Feature toggles

`app/features.py` is the catalog. Each feature has a **common** value that applies to every
visitor (no token needed) and optional per-plan values. A value set for the caller's plan
wins over the common one (`source: "subscription"`), so a plan can unlock a feature or switch
one off (e.g. `ads` for paid plans); otherwise the common value applies (`source: "common"`).
The plan is read from the database, not the token, so a plan change shows up immediately.
A request without a token gets common values only; an invalid token is rejected with 401.
Add a feature by adding a `Feature(...)` entry.
