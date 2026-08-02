# Oopsly UI

React Native 0.81.5 + Expo 54 client (NativeWind, Expo Router, Zustand).

## Run locally

```bash
pnpm install
# ui/.env → EXPO_PUBLIC_BACKEND_API=http://localhost:9009
pnpm start
```

API must be reachable at that host; the client appends `api/v1/oopsly`.

## Cypress e2e (mocked API)

Integration specs live under `cypress/e2e/`. They seed auth via `localStorage` (`auth-storage`) and stub `**/api/v1/oopsly/**` so the real API is not required.

```bash
# Local interactive
pnpm web                 # terminal 1 — http://localhost:8081
pnpm e2e:cypress:open    # terminal 2

# CI-style (instrumented web + headless Cypress)
pnpm e2e:cypress:ci
pnpm coverage:check:e2e  # gate screen/ + app/(user)/
pnpm coverage:merge      # Jest + Cypress → coverage-combined/
```

**Coverage model**

| Source | Paths | Gate |
| ------ | ----- | ---- |
| Jest | Services/store/utils/auth screens (see `jest.config.js`) | ~80% global |
| Cypress + Istanbul (`CYPRESS_COVERAGE=true`) | Especially `screen/` + `app/(user)/` | `coverage:check:e2e` |
| Merged | `coverage-combined/` | Report/artifact (not a second hard gate) |

Shared helpers: `cypress/support/commands.ts`, fixtures in `cypress/fixtures/api.ts`.

## Docs

- [Getting started](../docs/tutorials/getting-started.md)
- [Screens & routes](../docs/product/screens.md)
- [Run the UI](../docs/how-to/run-ui.md)
- [Conventions](../docs/reference/conventions.md) (`testID` required on interactive elements)
