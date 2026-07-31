# Tutorial: Getting started

This tutorial takes you from a clean machine to a running Oopsly stack: PostgreSQL, Redis, Spring Boot API, and Expo UI.

**Time:** ~15–30 minutes  
**Outcome:** Sign in with OTP (or no-op email in local/dev), open the home screen, and call the API.

---

## Prerequisites

| Tool | Version / notes |
| ---- | --------------- |
| Java | **21** (Temurin recommended) |
| Node.js | **20+** |
| pnpm | Latest (UI package manager) |
| Docker & Docker Compose | For Postgres + Redis |
| Git | Any recent version |
| Expo Go or emulator | Optional; `pnpm web` also works |

---

## 1. Clone the repository

```bash
git clone <repository-url> Oopsly
cd Oopsly
```

---

## 2. Start infrastructure

Preferred (Gradle wraps Compose):

```bash
cd api
./gradlew composeUp
```

Equivalent: `docker compose -f src/main/resources/docker-compose.yml up -d` from `api/`.

This starts:

- **PostgreSQL 15.4** on `localhost:5432` (db `oopsly`, user/password `postgres` by default)
- **Redis** on `localhost:6379` (empty password allowed in this compose file)

Stop later with `./gradlew composeDown` (removes volumes).

---

## 3. Run the API

```bash
cd api
# Recommended for local OTP without SMTP: loads .env.test and uses NoOp email (Spring profile test)
./gradlew bootRun -Pprofile=test
```

`bootRun` loads env files via Gradle: `-Pprofile=test` → `api/.env.test`; default profile name for the loader is `prod` → `api/.env`. You can also pass `-Dspring.profiles.active=test`.

Defaults from `application.yaml`:

| Setting | Default |
| ------- | ------- |
| Port | `9009` |
| Context path | `/api/v1/oopsly` |
| Base URL | `http://localhost:9009/api/v1/oopsly` |

Health check:

```bash
curl -s http://localhost:9009/api/v1/oopsly/actuator/health
```

Interactive API docs (Swagger UI):

```text
http://localhost:9009/api/v1/oopsly/swagger-ui/index.html
```

OpenAPI JSON:

```text
http://localhost:9009/api/v1/oopsly/api-docs
```

---

## 4. Configure and run the UI

```bash
cd ../ui
pnpm install
```

Ensure `ui/.env` points at your API host (path is appended by the client):

```env
EXPO_PUBLIC_BACKEND_API=http://localhost:9009
```

Start Expo:

```bash
pnpm start
```

Then press `w` for web, or scan the QR code with Expo Go / an emulator.

---

## 5. First login (OTP)

1. Open the app → onboarding / auth.
2. Enter an email address.
3. With `./gradlew bootRun -Pprofile=test`, `NoOpIEmailSender` skips SMTP and logs the send (check API logs for OTP handling in tests / local stubs).
4. Without the `test` profile, `EmailSender` uses SMTP (`EMAIL_USERNAME` / `EMAIL_PASSWORD`).
5. After validation you receive JWT **access** and **refresh** tokens; the UI stores them and attaches `Authorization: Bearer <access>` on protected calls.

---

## 6. Sanity check

| Check | Expected |
| ----- | -------- |
| `GET .../actuator/health` | Healthy |
| Swagger UI loads | Controller list visible |
| UI home after OTP | Authenticated shell (`app/(user)/…`) |
| Create a shelf | Appears in library |

---

## Next steps

- [API reference](../reference/api.md) — call endpoints manually
- [Architecture](../explanation/architecture.md) — how the layers fit
- [Contribute](../how-to/contribute.md) — before your first PR
- [Milestone 1](../architecture/MILESTONE_1.md) — current product slice
