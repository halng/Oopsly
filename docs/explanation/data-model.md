# Data model

All persistent entities extend `Audit`:

| Field | Type | Notes |
| ----- | ---- | ----- |
| `id` | UUID (time-based) | Primary key |
| `createdAt` | Instant | Creation timestamp |
| `updatedAt` | Instant | Last update |
| `deleted` | Boolean | Soft-delete flag (default `false`) |

---

## Entity relationship overview

```text
User 1──* Shelf 1──* Subject 1──* Card
                │         │         │
                │         │         └──* Tag (M:N via card_tags)
                │         │
                │         └── (optional) parent Subject
                │
                └──* TestSuite *──* Subject
                         │
                         └──* Question

User 1──1 Setting
```

---

## Core entities

### User (`users`)

Profile and gamification fields: `email` (unique, required), `name`, `displayName`, `bio`, `age`, `pictureUrl`, optional `hashedPassword`, `dailyStreak`, `totalXp`, `lastReviewedAt`. Owns shelves and one `SettingEntity`.

### Setting (`settings`)

Per-user preferences: `theme`, `language`, `spaceConfig` (JSON map of integers), optional `studySchedule` (JSON).

### Shelf (`shelves`)

Top-level library container: `name`, `description`, `icon`. Belongs to a user. Contains subjects and test suites.

### Subject (`subjects`)

Study unit (deck/topic): `name`, `description`, `dailyLimit` (default 20), `newCardsPerDay` (default 5), `interval` (default 1.0), `isPublic` (default false), optional `parentSubject` for nesting.

### Card (`cards`)

Flashcard: `front`, `back`, `difficultyLevel`, `nextPracticeTime`, `numberOfPractice`, FSRS fields (`fsrsStability`, `fsrsDifficulty`, `fsrsIntervalDays`, `fsrsRepetitions`), `lastReviewedAt`. Many-to-many tags.

### Tag (`tags` + `card_tags`)

User/org tags linked to cards for filtering.

### TestSuite (`test_suites`)

Assessment **preset**: `title`, `isActive`, `highestScore`, JSON `selection` (`mode`, `limit`, `shuffle`), M:N subjects, optional questions. **Run** resolves cards according to selection without replacing the normal SRS review endpoints.

### Question (`questions`)

Structured questions attached to a test suite (types via `QuestionType` enum).

### Enums (selected)

- `DifficultyLevel` — card difficulty / rating inputs
- `Theme`, `Language` — settings
- `QuestionType` — question kinds
- `TestSuiteSelectionPayload.Mode` — `ALL`, `DUE_ONLY`, `RANDOM`

---

## Soft delete semantics

Queries and services filter on `deleted = false`. Soft-deleting a parent may cascade logically in services (see controller descriptions). Recovery is possible because rows are retained.

---

## Source of truth

Java entities under `api/src/main/java/com/app/oopsly/api/entity/`. Prefer reading those classes when this document and the schema diverge after a migration.
