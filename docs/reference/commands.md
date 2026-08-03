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
| `./gradlew bootRun -Pprofile=perf` | Run API with authentication bypassed for isolated performance testing |

## Performance (`repository root`)

Start the API with the `perf` profile, then select a k6 scenario:

```bash
k6 run -e TEST_PROFILE=smoke performance/k6/backend.js
k6 run -e TEST_PROFILE=flaky performance/k6/backend.js
k6 run -e TEST_PROFILE=stress performance/k6/backend.js
k6 run -e TEST_PROFILE=spike performance/k6/backend.js
```

Override the target with `-e BASE_URL=https://example/api/v1/oopsly`. Never expose a
`skipAuth` deployment to untrusted networks.

GitHub Actions (native steps, path-filtered):

- [`.github/workflows/ci-api.yaml`](../../.github/workflows/ci-api.yaml) — API
- [`.github/workflows/ci-ui.yaml`](../../.github/workflows/ci-ui.yaml) — UI lint/Jest + headless Cypress
- [`.github/workflows/codeql-snyk.yaml`](../../.github/workflows/codeql-snyk.yaml) — security analysis
- [`.github/workflows/cd.yaml`](../../.github/workflows/cd.yaml) — API image, EAS artifacts, and Firebase Hosting
