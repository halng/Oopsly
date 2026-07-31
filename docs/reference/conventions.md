# Conventions

Canonical short list also lives in [AGENTS.md](../../AGENTS.md).

## API

| Rule | Detail |
| ---- | ------ |
| Soft deletes | Use `PATCH` to mark `deleted = true`. Avoid HTTP `DELETE` for domain aggregates |
| Response type | Return `ApiRes` wrapping `Res` (`status`, `message`, `data`, `isSuccess`, `timestamp`) |
| DI | Constructor injection; prefer `@RequiredArgsConstructor`. Never field `@Autowired` |
| Validation | Bean Validation on request bodies / params |
| Resilience | Resilience4j circuit breakers configured per service area |
| OpenAPI | Annotate controllers with `@Tag`, `@Operation`, `@ApiResponses` |

## UI

| Rule | Detail |
| ---- | ------ |
| `testID` | Every interactive element needs `testID` or `data-testid` |
| Styling | NativeWind 4 (Tailwind) |
| Routing | Expo Router file routes under `ui/app/` |
| State | Zustand stores under `ui/store/` |
| HTTP | Shared `apiClient` with auth + public-path handling |

## Licensing

All source files require the Apache 2.0 header with author **Hao Nguyen Tan** and the current year.

## Commits

```text
OOPS-{issue_number}: {type} - {short description}
```

Max 72 characters on the first line.

## Naming notes

Path parameters in the API sometimes use `shelveId` (historical spelling) while entity/table names use `shelf` / `shelves`. Clients should follow the path templates exactly as documented in the [API reference](./api.md).
