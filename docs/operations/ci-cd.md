# CI / CD

## Continuous integration

### Split pipelines (native GitHub Actions)

| Pipeline | Workflow | Jobs |
| -------- | -------- | ---- |
| API | [`.github/workflows/ci-api.yaml`](../../.github/workflows/ci-api.yaml) | `api` — Gradle build, spotless, test, Jacoco (~90%), optional Snyk |
| UI | [`.github/workflows/ci-ui.yaml`](../../.github/workflows/ci-ui.yaml) | `ui` — pnpm lint + Jest; `ui-e2e` — headless Cypress (Electron) |

Path filters: API on `api/**`, UI on `ui/**`. No shell orchestration — steps are native Actions/`run` commands.

Cypress instrumentation env (`CYPRESS_COVERAGE` / `BABEL_ENV`) is only on the `ui-e2e` job.

Artifacts: `api-jacoco-report`, `ui-jest-coverage`, `ui-cypress-coverage`, Cypress screenshots on e2e failure.

## Continuous delivery

Workflow: [`.github/workflows/cd.yaml`](../../.github/workflows/cd.yaml) → [`.github/workflows/cd.sh`](../../.github/workflows/cd.sh)

- API image published to **GHCR** as `ghcr.io/halng/oopsly-api` via Spring Boot **`bootBuildImage`** (no checked-in `Dockerfile` required for that path)
- UI Android builds via **EAS** (`EXPO_TOKEN`): production-oriented on `main`, development on `release/*`
- UI web export via `expo export --platform web`, followed by deployment to **Firebase Hosting**

Firebase Hosting deployment requires:

| Name | Kind | Purpose |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | Secret | JSON credentials consumed by `action-hosting-deploy` |
| `FIREBASE_API_KEY` | Secret | Firebase web key injected during Expo export |
| `FIREBASE_PROJECT_ID` | Repository variable | Hosting project selected by the deploy action |
| `EXPO_PUBLIC_BACKEND_API` | Repository variable | Production API origin embedded in the web build |

The hosting settings live in `firebase.json`; the exported static files are read from
`ui/dist`, and unknown routes rewrite to `index.html` for Expo Router.

Manual workflows:

- [`.github/workflows/deploy.yaml`](../../.github/workflows/deploy.yaml) runs only by `workflow_dispatch`, requires release tag, environment (`stg`, `perf`, `prod`), and platform (`web`, `ios`, `android`) inputs, deploys the tagged API image, checks backend health, then deploys the selected UI artifact.
- [`.github/workflows/perf-test.yaml`](../../.github/workflows/perf-test.yaml) runs for published releases or by `workflow_dispatch`, accepts a release tag and test profile (`smoke`, `flaky`, `stress`, `spike`), deploys API to Cloud Run with `SPRING_PROFILES_ACTIVE=perf`, runs k6 from `api/src/test/java/com/app/oopsly/api/perf`, uploads report artifacts, and deletes the temporary Cloud Run service.

## Secrets

| Secret | Used by |
| ------ | ------- |
| `SNYK_TOKEN` | CI security scan |
| `GITHUB_TOKEN` | Actions / GHCR |
| `EXPO_TOKEN` | EAS builds |
| `FIREBASE_API_KEY` | Firebase web export |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Hosting deployment |
| `PERF_FIREBASE_REFRESH_TOKEN` | Refresh credential used to mint a short-lived Firebase ID token for each k6 run |
| `PERF_DB_HOST`, `PERF_DB_PORT`, `PERF_DB_NAME` | PostgreSQL endpoint used by the ephemeral performance service |
| `PERF_DB_USERNAME`, `PERF_DB_PASSWORD` | PostgreSQL credentials used by the ephemeral performance service |

Static Sonar configuration remains in the packages, but there is currently no dedicated
Sonar GitHub Actions workflow in this repository.
