# Oopsly — Agent Instructions

Oopsly is a cross-platform flashcard / spaced repetition (SRS) app.

**Stack:** React Native 0.81.5 + Expo 54 + NativeWind 4.2 (`ui/`) · Spring Boot 3.5.8 + Java 21 (`api/`) · Python pytest (`test/`)

## Detailed Guidelines

| Area | File |
|------|------|
| Project-wide standards | [.ai/overall.mdc](.ai/overall.mdc) |
| API / Spring Boot | [.ai/api.mdc](.ai/api.mdc) |
| UI / React Native | [.ai/ui.mdc](.ai/ui.mdc) |
| Testing | [.ai/tests.mdc](.ai/tests.mdc) |
| Documentation | [.ai/docs.mdc](.ai/docs.mdc) |

## Build & Test Commands

### API (from `api/`)

```bash
./gradlew clean build -x test   # build, skip tests
./gradlew test                  # run unit tests
./gradlew spotlessApply         # auto-format Java (required before commit)
./gradlew jacocoTestCoverageVerification  # coverage check
```

### UI (from `ui/`)

```bash
pnpm install        # install deps
pnpm test           # Jest
pnpm test:coverage  # Jest with coverage
pnpm lint           # ESLint (required before commit)
```

### Integration tests (from `test/`)

```bash
pip install -r config/requirement.txt
pytest tests/integration/
pytest tests/e2e/
```

## Critical Conventions

- **Soft deletes**: Use `PATCH`, never `DELETE`
- **testID**: Every interactive React Native element needs a `testID` (or `data-testid`) prop
- **License header**: All source files require Apache 2.0 header — author `Hao Nguyen Tan`, current year
- **Commit format**: `OOPS-{issue_number}: {type} - {short description}` (max 72 chars first line)
- **Java DI**: Constructor injection via `@RequiredArgsConstructor`; never field `@Autowired`
- **API response**: All endpoints return `ApiResponse<T>` wrapper (`isSuccess`, `message`, `data`, `timestamp`)

## Skills

| Skill | Use when |
|-------|----------|
| `/java-coding-convention` | Creating or reviewing Spring Boot controllers, services, entities, tests |
| `/ui-react-native-expo` | Working on Expo screens, components, services, navigation, or stores |
| `/nativewind-design-system` | Styling, colors (`#8BC34A` primary), spacing, layout in the UI app |
| `/jest-react-native-testing` | Writing or reviewing Jest + React Native Testing Library tests |
| `/zustand-mobile-auth-state` | Auth tokens, persisted state, AsyncStorage-backed stores |
