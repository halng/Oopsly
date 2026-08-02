# Oopsly — Agent Instructions

Oopsly is a cross-platform flashcard / spaced repetition (SRS) app.

**Stack:** React Native 0.81.5 + Expo 54 + NativeWind 4.2 (`ui/`) · Spring Boot 3.5.8 + Java 21 (`api/`)

**Human docs:** [docs/README.md](./docs/README.md) (Diátaxis). Prefer those pages over inventing architecture. 


## Build & Test Commands

### API (from `api/`)

```bash
./gradlew clean build -x test   # build, skip tests
./gradlew test                  # run unit tests
./gradlew spotlessApply         # auto-format Java (required before commit)
./gradlew jacocoTestCoverageVerification  # coverage check
```

GitHub Actions API CI: `.github/workflows/ci-api.yaml` (native steps)

### UI (from `ui/`)

```bash
pnpm install             # install deps
pnpm test                # Jest
pnpm test:coverage       # Jest with coverage (80% gate on unit-included paths)
pnpm lint                # ESLint (required before commit)
pnpm e2e:cypress:ci      # Expo web + Cypress with Istanbul coverage (CI)
pnpm coverage:check:e2e  # gate screen/ + app/(user)/ from Cypress report
pnpm coverage:merge      # merge Jest + Cypress → coverage-combined/
```

GitHub Actions UI CI: `.github/workflows/ci-ui.yaml` (native steps + headless Cypress job)

## Critical Conventions

- **Soft deletes**: Use `PATCH`, never `DELETE`
- **testID**: Every interactive React Native element needs a `testID` (or `data-testid`) prop
- **License header**: All source files require Apache 2.0 header — author `Hao Nguyen Tan`, current year
- **Commit format**: `OOPS-{issue_number}: {type} - {short description}` (max 72 chars first line)
- **Java DI**: Constructor injection via `@RequiredArgsConstructor`; never field `@Autowired`
- **API response**: All endpoints return `ApiResponse<T>` wrapper (`isSuccess`, `message`, `data`, `timestamp`)
