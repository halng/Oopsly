# CI / CD

## Continuous integration

### Unified (legacy)

Workflow: [`.github/workflows/ci.yaml`](../../.github/workflows/ci.yaml) → [`.github/workflows/ci.sh`](../../.github/workflows/ci.sh)

Runs API + UI via one shell script. Still available.

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

## SonarQube / SonarCloud

Workflow: [`.github/workflows/sonar-qube.yaml`](../../.github/workflows/sonar-qube.yaml)

| Job | How |
| --- | --- |
| `sonarqube-api` | `./gradlew build sonar` in `api/` |
| `sonarqube-ui` | `pnpm test:coverage` then `SonarSource/sonarqube-scan-action` with `projectBaseDir: ui` |

UI config: [`ui/sonar-project.properties`](../../ui/sonar-project.properties) (LCOV at `coverage/lcov.info` relative to `ui/`).

## Secrets

| Secret | Used by |
| ------ | ------- |
| `SNYK_TOKEN` | CI security scan |
| `GITHUB_TOKEN` | Actions / GHCR |
| `EXPO_TOKEN` | EAS builds |
| `SONAR_TOKEN_API` | SonarCloud API project |
| `SONAR_TOKEN_UI` | SonarCloud UI project |

## QA agent workflow

[`.github/workflows/qa-agent.yml`](../../.github/workflows/qa-agent.yml) — label-driven automation. It may reference docs paths that are not yet present; treat those as optional until wired.
