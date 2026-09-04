# Commands reference

## API (`api/`)

| Command | Purpose |
| ------- | ------- |
| `./gradlew bootRun` | Run the server |
| `./gradlew clean build -x test` | Compile / package, skip tests |
| `./gradlew test` | Unit tests |
| `./gradlew spotlessApply` | Auto-format Java |
| `./gradlew spotlessCheck` | Fail if formatting drifts |
| `./gradlew jacocoTestCoverageVerification` | Coverage gate |
| `./gradlew integrationTest` | Integration tests under `com.app.oopsly.api.integration` (H2 + embedded Redis) |

## UI (`ui/`)

| Command | Purpose |
| ------- | ------- |
| `pnpm install` | Install dependencies |
| `pnpm start` | Expo start (clear cache) |
| `pnpm android` / `pnpm ios` / `pnpm web` | Platform targets |
| `pnpm lint` | ESLint |
| `pnpm test` | Jest |
| `pnpm test:coverage` | Jest with coverage (JSON/LCOV; 80% gate) |
| `pnpm e2e:cypress:open` / `pnpm e2e:cypress:run` | Cypress E2E |
| `pnpm e2e:cypress:ci` | Start instrumented Expo web + Cypress (CI) |
| `pnpm coverage:check:e2e` | Gate Cypress coverage for `screen/` + `app/(user)/` |
| `pnpm coverage:merge` | Merge Jest + Cypress into `coverage-combined/` |
| `pnpm reset:deps` | Wipe `node_modules`, lockfile, `.expo` |

## Infrastructure (`api/`)

| Command | Purpose |
| ------- | ------- |
| `./gradlew composeUp` | Start Postgres + Redis |
| `./gradlew composeDown` | Stop and remove volumes |
| `./gradlew bootRun -Pprofile=test` | Run API loading `.env.test` |
| `./gradlew bootRun -Pprofile=perf` | Run API with the perf security profile and SQL/stat logging enabled |

## Performance (`repository root`)

Provide `BASE_URL` (must include `/api/v1/oopsly`) and select a k6 scenario:

```bash
k6 run -e BASE_URL="https://example/api/v1/oopsly" -e TEST_PROFILE=smoke api/src/test/perf/k6/backend.js
k6 run -e BASE_URL="https://example/api/v1/oopsly" -e TEST_PROFILE=flaky api/src/test/perf/k6/backend.js
k6 run -e BASE_URL="https://example/api/v1/oopsly" -e TEST_PROFILE=stress api/src/test/perf/k6/backend.js
k6 run -e BASE_URL="https://example/api/v1/oopsly" -e TEST_PROFILE=spike api/src/test/perf/k6/backend.js
```

GitHub Actions (native steps, path-filtered):

- [`.github/workflows/ci-api.yaml`](../../.github/workflows/ci-api.yaml) — API
- [`.github/workflows/ci-ui.yaml`](../../.github/workflows/ci-ui.yaml) — UI lint/Jest + headless Cypress
- [`.github/workflows/codeql-snyk.yaml`](../../.github/workflows/codeql-snyk.yaml) — security analysis
- [`.github/workflows/cd.yaml`](../../.github/workflows/cd.yaml) — API image, EAS artifacts, and Firebase Hosting
- [`.github/workflows/deploy.yaml`](../../.github/workflows/deploy.yaml) — tagged release deployment by environment and platform, with prerequisite and health checks
- [`.github/workflows/perf-test.yaml`](../../.github/workflows/perf-test.yaml) — release/manual GCP deploy, k6 run, report upload, cleanup
