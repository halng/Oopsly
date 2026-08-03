# Environment variables

## API (`api/`)

Defined primarily in `api/src/main/resources/application.yaml` and overrideable via env.

| Variable | Default (local) | Purpose |
| -------- | --------------- | ------- |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `oopsly` | Database name |
| `DB_USERNAME` | `postgres` | DB user |
| `DB_PASSWORD` | `postgres` | DB password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | (dev default in yaml) | HMAC secret for JWTs — **override in every non-local env** |
| `ALLOWED_ORIGINS` | `http://localhost:8081` | CORS allowed origins |
| `GOOGLE_CLIENT_ID` | `changeme` | Google Sign-In (feature-flagged off by default) |
| `GOOGLE_APPLICATION_CREDENTIALS` | *(unset)* | Path to the Firebase Admin service-account JSON for local API runs |
| `EMAIL_USERNAME` | `changeme@gmail.com` | SMTP username |
| `EMAIL_PASSWORD` | `changeme` | SMTP password / app password |
| `MEDIA_BUCKET` | *(unset)* | S3 bucket for card media; without it, media upload returns “not configured” |
| `REDIS_PASSWORD` | *(optional)* | Used in SIT-style Redis URLs (`application-sit.yaml`) |
| `EXPO_TOKEN` | *(CI)* | EAS builds in CD |

Env file loading for `bootRun`: `-Pprofile=test` → `api/.env.test`; default loader profile `prod` → `api/.env`.

Feature flags in config:

| Key | Default | Meaning |
| --- | ------- | ------- |
| `app.features.authWithGoogle` | `false` | Google auth |
| `app.features.authWithJwt` | `false` | Legacy API-issued JWT verification |
| `app.features.authWithFirebase` | `true` | Firebase ID-token verification |
| `app.features.skipAuth` | `false` | Authentication bypass for the isolated `perf` profile only |

JWT lifetimes (yaml, not env by default):

| Property | Default |
| -------- | ------- |
| `app.jwt.expiration-in-ms` | `86400000` (24h) |
| `app.jwt.refresh-expiration-in-ms` | `604800000` (7d) |

Docker Compose (`api/src/main/resources/docker-compose.yml`) also accepts `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

SIT / test env files may exist as `api/.env.sit` and `api/.env.test` — do not commit secrets.

## UI (`ui/`)

| Variable | Example | Purpose |
| -------- | ------- | ------- |
| `EXPO_PUBLIC_BACKEND_API` | `http://localhost:9009` | API host (no context path; client appends `api/v1/oopsly`) |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key | Firebase Identity Toolkit and Secure Token requests |
| `EXPO_PUBLIC_FIREBASE_EMAIL_LINK` | `https://oopsly.web.app/verification` | Authorized continue URL embedded in passwordless email links |

## CI secrets

Referenced by GitHub Actions:

| Secret | Purpose |
| ------ | ------- |
| `SNYK_TOKEN` | Dependency / security scanning |
| `GITHUB_TOKEN` | Provided by Actions |
| `EXPO_TOKEN` | EAS build authentication |
| `FIREBASE_API_KEY` | Injected into the exported Expo web client |
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON used by the Firebase Hosting action |

The CD workflow also reads repository variables `EXPO_PUBLIC_BACKEND_API` and
`FIREBASE_PROJECT_ID`.

Never commit production JWT secrets, SMTP passwords, Firebase service-account JSON, or
other cloud credentials into the repository. Firebase web API keys are not Admin secrets,
but should still be restricted to the intended Firebase APIs, applications, and domains.
