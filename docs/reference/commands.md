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

## CI

```bash
./.github/workflows/ci.sh [--skip-security] [--with-e2e]  # unified local script (legacy)
```

GitHub Actions (native steps, path-filtered):

- [`.github/workflows/ci-api.yaml`](../../.github/workflows/ci-api.yaml) — API
- [`.github/workflows/ci-ui.yaml`](../../.github/workflows/ci-ui.yaml) — UI lint/Jest + headless Cypress
- [`.github/workflows/ci.yaml`](../../.github/workflows/ci.yaml) — unified script (legacy)
