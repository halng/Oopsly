# CI / CD

## Continuous integration

Workflow: [`.github/workflows/ci.yaml`](../../.github/workflows/ci.yaml) → [`.github/workflows/ci.sh`](../../.github/workflows/ci.sh)

**Triggers:** push/PR to `main` and `release/**`; weekly Sunday cron.

**Rough steps:**

1. Validate Java, Node, Python tooling  
2. **API:** `clean build -x test` → `spotlessCheck` → `test` → `integrationTest` → Jacoco verification (**~90%** gate on included classes)  
3. **UI:** `pnpm install` → `lint` → `test:coverage` (Jest **~80%** gate on unit-included paths; `screen/` and `app/(user)/` still excluded from Jest — see `ui/jest.config.js`)  
4. **UI e2e:** start Expo web with Istanbul (`CYPRESS_COVERAGE=true`) → `pnpm e2e:cypress:ci` → `coverage:check:e2e` (gate on `screen/` + `app/(user)/`) → `coverage:merge` (Jest + Cypress → `coverage-combined/`)  
5. Snyk on `api/` when `SNYK_TOKEN` is set  

Coverage artifacts (`ui/coverage/`, `ui/coverage-cypress/`, `ui/coverage-combined/`) are uploaded from the CI job.

## Continuous delivery

Workflow: [`.github/workflows/cd.yaml`](../../.github/workflows/cd.yaml) → [`.github/workflows/cd.sh`](../../.github/workflows/cd.sh)

- API image published to **GHCR** as `ghcr.io/halng/oopsly-api` via Spring Boot **`bootBuildImage`** (no checked-in `Dockerfile` required for that path)
- UI Android builds via **EAS** (`EXPO_TOKEN`): production-oriented on `main`, development on `release/*`

## Secrets

| Secret | Used by |
| ------ | ------- |
| `SNYK_TOKEN` | CI security scan |
| `GITHUB_TOKEN` | Actions / GHCR |
| `EXPO_TOKEN` | EAS builds |

## QA agent workflow

[`.github/workflows/qa-agent.yml`](../../.github/workflows/qa-agent.yml) — label-driven automation. It may reference docs paths that are not yet present; treat those as optional until wired.
