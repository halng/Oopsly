# How to contribute

## Workflow

1. Create a branch from `main` (or the active release branch).
2. Implement against an issue id `OOPS-{n}` when available.
3. Run local checks (below).
4. Open a pull request with a clear summary and test plan.

## Commit message format

```text
OOPS-{issue_number}: {type} - {short description}
```

- First line max **72** characters
- Types commonly used: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

Example:

```text
OOPS-42: feat - add due-card limit query param
```

## Required checks before commit

### API (`api/`)

```bash
./gradlew spotlessApply          # format (required)
./gradlew test                   # unit tests
./gradlew jacocoTestCoverageVerification   # coverage gate
```

### UI (`ui/`)

```bash
pnpm lint
pnpm test
# Optional locally (CI always runs these):
# pnpm e2e:cypress:ci && pnpm coverage:check:e2e && pnpm coverage:merge
```

CI also runs the unified script [`.github/workflows/ci.sh`](../../.github/workflows/ci.sh) via [`.github/workflows/ci.yaml`](../../.github/workflows/ci.yaml) — including Cypress e2e + coverage gates.

## Coding conventions

See [Conventions](../reference/conventions.md) and [AGENTS.md](../../AGENTS.md).

Highlights:

- Soft delete via **`PATCH`**, never HTTP `DELETE` for domain resources (tags unlink is an exception; see API reference)
- Every interactive RN element needs `testID` / `data-testid`
- Apache 2.0 license header on source files — author **Hao Nguyen Tan**, current year
- Java: constructor injection with `@RequiredArgsConstructor`; no field `@Autowired`
- API responses use the standard envelope (`isSuccess`, `message`, `data`, `timestamp`)

## Issue templates

Feature requests: [`.github/ISSUE_TEMPLATE/feature_request.md`](../../.github/ISSUE_TEMPLATE/feature_request.md)
