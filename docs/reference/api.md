# API reference

Base URL (local default):

```text
http://localhost:9009/api/v1/oopsly
```

Context path is configured as `/api/${server.active.version}/oopsly` with `server.active.version=v1`.

Interactive docs while the server is running:

- Swagger UI: `/swagger-ui/index.html`
- OpenAPI JSON: `/api-docs`

---

## Response envelope

Every endpoint returns a body shaped like:

```json
{
  "status": 200,
  "message": "string",
  "data": {},
  "isSuccess": true,
  "timestamp": "2026-07-31T00:00:00Z"
}
```

TypeScript mirror: `ui/types/ApiRes.ts`  
Java types: `ApiRes` / `Res` under `com.app.oopsly.api.viewmodel`.

---

## Authentication

| Path | Auth |
| ---- | ---- |
| `POST /otp`, `POST /otp/validate` | Public |
| `POST /users/refresh-token` | Public |
| `/actuator/health`, Swagger, OpenAPI | Public |
| Everything else | `Authorization: Bearer <access_token>` |

See [Authentication](../explanation/authentication.md).

---

## Soft deletes

Domain resources are soft-deleted with **`PATCH …/{id}`** (sets `deleted = true`). Do not use HTTP `DELETE` for shelves, subjects, cards, questions, or test suites.

Tag **unlink** from a card uses `DELETE` on the association path (not a soft delete of the tag entity itself).

---

## Endpoints

Paths below are relative to the context path.

### OTP

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/otp?email=` | Send OTP to email |
| `POST` | `/otp/validate` | Verify OTP; returns tokens |

### Users & session

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/users/refresh-token` | Rotate access/refresh tokens |
| `POST` | `/users/logout` | Invalidate session / refresh |
| `GET` | `/users/validate` | Validate current access token |

### Profile & settings

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/user/profile` | Current user profile |
| `PATCH` | `/user/profile` | Update profile fields |
| `PATCH` | `/user/settings` | Update theme, language, SRS/space config, schedule |

### Stats

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/users/me/stats` | Aggregated learning stats for the current user |

### Shelves

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/shelves` | List shelves |
| `POST` | `/shelves` | Create shelf |
| `GET` | `/shelves/{id}` | Get shelf |
| `PUT` | `/shelves/{id}` | Update shelf |
| `PATCH` | `/shelves/{id}` | Soft-delete shelf |

### Subjects

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/shelves/{shelfId}/subjects` | List subjects |
| `POST` | `/shelves/{shelfId}/subjects` | Create subject |
| `GET` | `/shelves/{shelfId}/subjects/{id}` | Get subject |
| `PUT` | `/shelves/{shelfId}/subjects/{id}` | Update subject |
| `PUT` | `/shelves/{shelfId}/subjects/{id}/settings` | Subject study settings (daily limit, new cards, etc.) |
| `PATCH` | `/shelves/{shelfId}/subjects/{id}` | Soft-delete subject |

### Cards (flashcards)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/shelves/{shelveId}/subjects/{subjectId}/cards` | List cards |
| `POST` | `/shelves/{shelveId}/subjects/{subjectId}/cards` | Create card |
| `GET` | `/shelves/{shelveId}/subjects/{subjectId}/cards/{id}` | Get card |
| `PUT` | `/shelves/{shelveId}/subjects/{subjectId}/cards/{id}` | Update card |
| `PUT` | `/shelves/{shelveId}/subjects/{subjectId}/cards/difficulty` | Batch difficulty / review ratings (SRS) |
| `GET` | `/shelves/{shelveId}/subjects/{subjectId}/cards/due` | Due cards (`limit`, default 20) |
| `PATCH` | `/shelves/{shelveId}/subjects/{subjectId}/cards/{id}` | Soft-delete card |

### Card media

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/shelves/{shelveId}/subjects/{subjectId}/cards/{cardId}/media` | Request media upload; **requires `MEDIA_BUCKET`** — otherwise responds that media is not configured (stub) |

### Tags

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/tags` | Create tag |
| `GET` | `/tags` | List tags |
| `PATCH` | `/tags/{id}` | Soft-delete / update tag |
| `POST` | `/shelves/{shelveId}/subjects/{subjectId}/cards/{cardId}/tags/{tagId}` | Link tag to card |
| `DELETE` | `/shelves/{shelveId}/subjects/{subjectId}/cards/{cardId}/tags/{tagId}` | Unlink tag from card |
| `GET` | `/shelves/{shelveId}/subjects/{subjectId}/cards/by-tag/{tagId}` | Cards filtered by tag |

### Test suites (assessment presets)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/shelves/{shelveId}/test-suites` | List presets |
| `POST` | `/shelves/{shelveId}/test-suites` | Create preset |
| `GET` | `/shelves/{shelveId}/test-suites/{id}` | Get preset |
| `PUT` | `/shelves/{shelveId}/test-suites/{id}` | Update preset |
| `PATCH` | `/shelves/{shelveId}/test-suites/{id}` | Soft-delete preset |
| `POST` | `/shelves/{shelveId}/test-suites/auto-generate` | Auto-generate preset |
| `POST` | `/shelves/{shelveId}/test-suites/{id}/run` | Run preset; returns selected cards for a session |

Selection payload (`selection` JSON): `mode` (`ALL` \| `DUE_ONLY` \| `RANDOM`), optional `limit`, optional `shuffle`.

### Questions (under a test suite)

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/test-suites/{testSuiteId}/questions` | List questions |
| `POST` | `/test-suites/{testSuiteId}/questions` | Create question |
| `GET` | `/test-suites/{testSuiteId}/questions/{id}` | Get question |
| `PUT` | `/test-suites/{testSuiteId}/questions/{id}` | Update question |
| `PATCH` | `/test-suites/{testSuiteId}/questions/{id}` | Soft-delete question |

### Test-suite cards

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/test-suites/{testSuiteId}/cards` | Cards associated with a test suite |

### Discover

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/discover` | Browse public subjects / content |
| `POST` | `/discover/{subjectId}/clone` | Clone a public subject into the user’s library |

---

## Client services

UI wrappers live under `ui/services/`:

| Service | Domain |
| ------- | ------ |
| `AuthService` | OTP / session |
| `UserService` | Users |
| `ProfileService` | Profile & settings |
| `ShelfService` | Shelves |
| `SubjectService` | Subjects |
| `CardService` | Cards / due / difficulty |
| `TestSuiteService` | Test suites / run |
| `DiscoverService` | Discover & clone |

HTTP client: `ui/services/index.ts` (`apiClient`).

---

## Interactive docs

With the API running, prefer Swagger for request/response schemas generated from controller annotations (`@Operation`, `@ApiResponses`, etc.).

The checked-in snapshot `api/src/main/resources/openapi.json` may lag behind live controllers (Discover, Tags, Stats, Media, due cards, etc.). Prefer runtime `/api-docs` and regenerate the snapshot when you need it committed.
