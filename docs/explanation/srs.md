# Spaced repetition (FSRS)

Oopsly schedules card reviews with an **FSRS-4.5** implementation in `com.app.oopsly.api.util.FsrsAlgorithm`.

---

## Grades

| Grade | Meaning |
| ----- | ------- |
| 1 | Again |
| 2 | Hard |
| 3 | Good |
| 4 | Easy |

---

## Card state persisted

On each card (`CardEntity`):

| Field | Role |
| ----- | ---- |
| `fsrsStability` | Memory stability estimate |
| `fsrsDifficulty` | Item difficulty |
| `fsrsIntervalDays` | Current interval |
| `fsrsRepetitions` | Successful repetition count |
| `nextPracticeTime` | When the card is due |
| `numberOfPractice` | Practice counter |
| `lastReviewedAt` | Last review timestamp |
| `difficultyLevel` | Discrete difficulty enum used by the product UI |

---

## Study loop

```text
GET  .../cards/due?limit=N     → queue for session
User rates each card (1–4)
PUT  .../cards/difficulty      → batch update; server runs FSRS.schedule
```

Subject settings influence throughput (`dailyLimit`, `newCardsPerDay`, `interval`). User-level `spaceConfig` / `studySchedule` live on `SettingEntity`.

---

## Test suites vs SRS

A **test suite run** (`POST …/test-suites/{id}/run`) returns cards for a read-only or assessment-style session based on `selection` (`ALL`, `DUE_ONLY`, `RANDOM`). Rating cards during study still goes through the normal card difficulty / FSRS endpoints so the long-term schedule stays authoritative.

---

## Pedagogical context

Broader research on active recall and spacing is summarized in [EdTech research](../EdTech_RESEARCH.md). Product positioning: Quizlet-like usability with Anki-like scheduling rigor ([Milestone 1](../architecture/MILESTONE_1.md)).
