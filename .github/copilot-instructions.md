# Osmosis – Copilot Instructions

These instructions help AI coding agents work productively in this repo by highlighting actual patterns, workflows, and conventions used across the monorepo.

## Big Picture
- Monorepo with three pillars:
  - Backend: Spring Boot 3.5 (Java 21) in [api](api) serving on port 9009 with base path `/api/v1/osmosis` per [api/src/main/resources/application.yaml](api/src/main/resources/application.yaml).
  - Mobile/Web UI: Expo + React Native in [ui](ui) using `expo-router` typed routes and Tailwind via NativeWind.
  - Tests & Perf: Python-based E2E (Playwright) and load testing (Locust) in [test](test).
- Data: Postgres + Redis via Compose in [api/src/main/resources/docker-compose.yml](api/src/main/resources/docker-compose.yml).
- Auth: JWT enabled; optional Google OAuth. See `app.jwt.*` and `app.google.client-id` in [application.yaml](api/src/main/resources/application.yaml).

## Developer Workflows
- Backend (dev):
  - Start infra: `./gradlew composeUp` in [api](api).
  - Run API: `./gradlew bootRun` in [api](api).
  - Build Native image (Docker): see [api/Dockerfile](api/Dockerfile) (uses `nativeCompile`).
  - Coverage gates: `jacocoTestCoverageVerification` is configured (80%+ per-class). See [api/build.gradle](api/build.gradle).
- Backend (services):
  - Postgres on `5432`, Redis on `6379` via [docker-compose.yml](api/src/main/resources/docker-compose.yml).
  - Required envs: `DB_*`, `REDIS_*`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `EMAIL_*`. Defaults exist in [application.yaml](api/src/main/resources/application.yaml).
- UI:
  - Install deps: `pnpm install` in [ui](ui).
  - Start dev: `pnpm start` (or `pnpm web` / `pnpm android` / `pnpm ios`). Scripts in [ui/package.json](ui/package.json).
  - Unit tests: `pnpm test` or `pnpm test:coverage` with config in [ui/jest.config.js](ui/jest.config.js).
- Tests (Python):
  - Install tools: `pip install -r test/config/requirement.txt`.
  - E2E: `pytest -c test/pytest.ini` (parallel via `-n auto`, artifacts in `test-results`). See device matrix in [test/tests/e2e/conftest.py](test/tests/e2e/conftest.py).
  - Perf: `locust -f test/tests/perf/locustfile.py` or dockerized orchestrator in [test/docker-compose.yaml](test/docker-compose.yaml).

## UI Conventions
- Routing: File-based routes in [ui/app](ui/app); use route groups like [ui/app/(user)](ui/app/%28user%29). Enable typed routes in [ui/app.json](ui/app.json) under `experiments.typedRoutes`.
- State: Global auth state via `useAuthStore` in [ui/store/AuthStore.ts](ui/store/AuthStore.ts).
- Styling: Tailwind tokens backed by CSS variables. See [ui/tailwind.config.js](ui/tailwind.config.js) (`darkMode` via `DARK_MODE`, `important: 'html'`, wide `safelist`). Prefer themed components in [ui/components](ui/components).
- Testing: Jest preset `jest-expo`; `moduleNameMapper` supports `@/` alias. Coverage excludes non-critical folders until adopted (see `collectCoverageFrom` and thresholds in [ui/jest.config.js](ui/jest.config.js)).

## Backend Conventions
- Package: `com.app.osmosis` with Spring Boot starters for Web, Security, JPA, WebSocket, Validation, Redis, Resilience4j.
- Base path: `/api/v1/osmosis` from [application.yaml](api/src/main/resources/application.yaml); keep controllers under that versioned path.
- DB: PostgreSQL via `spring.datasource.*`; JPA `ddl-auto: create-drop` for dev. Move to migrations before production.
- Observability: Actuator enabled; prefer health endpoints for perf checks (Locust hits `/health`).
- Quality: Spotless formatting and Jacoco reports are configured in [api/build.gradle](api/build.gradle).

## Integration Patterns
- UI → API: JSON over HTTP to `/api/v1/osmosis/...`.
- Auth: Include `Authorization: Bearer <jwt>` for protected endpoints; obtain tokens via the auth flow. Google sign-in toggled by `app.features.authWithGoogle`.
- Local infra: Start Postgres/Redis via `./gradlew composeUp` or `docker compose -f api/src/main/resources/docker-compose.yml up -d`.

## Examples
- New UI screen: add `app/topic-generation.tsx` using themed components and `useAuthStore`; write a Jest test next to it (e.g., `app/topic-generation.test.tsx`).
- New API endpoint: place controller under versioned path, persist via JPA, and expose DTOs; respect JWT auth if `authWithJwt: true`.
- E2E addition: write a Playwright test under [test/tests/e2e/suites](test/tests/e2e/suites) leveraging the `browser_context_args` from [conftest.py](test/tests/e2e/conftest.py).

If any section feels incomplete (e.g., missing specific endpoints, controller locations), tell us what you need and we’ll iterate this doc.