# CI / CD

## Continuous integration

Workflow: [`.github/workflows/ci.yaml`](../../.github/workflows/ci.yaml) → [`.github/workflows/ci.sh`](../../.github/workflows/ci.sh)

**Triggers:** push/PR to `main` and `release/**`; weekly Sunday cron.

**Jobs:**

1. **`ci`** — tooling validate → API Gradle (build, spotless, test, integrationTest, Jacoco ~90%) → UI `lint` + Jest `test:coverage` (~80%). Snyk on `api/` when `SNYK_TOKEN` is set.  
2. **`ui-e2e`** — headless Cypress via [`cypress-io/github-action`](https://github.com/cypress-io/github-action) (Electron, `headed: false`): start instrumented Expo web → wait on `http://127.0.0.1:8081` → `pnpm e2e:cypress:run` → `coverage:check:e2e` for `screen/` + `app/(user)/`.

Cypress instrumentation env (`CYPRESS_COVERAGE` / `BABEL_ENV`) is **only** on the `ui-e2e` job so Jest is never affected.

Local e2e: `cd ui && pnpm e2e:cypress:ci`, or `./.github/workflows/ci.sh --with-e2e`.

Artifacts: `ui-jest-coverage`, `ui-cypress-coverage`, Cypress screenshots on e2e failure.

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
