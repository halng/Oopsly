# Glossary

| Term | Meaning |
| ---- | ------- |
| **Shelf** | Top-level library container owned by a user. Holds subjects and test suites. |
| **Subject** | Deck / topic under a shelf. Contains cards; may be nested (`parentSubject`) and marked `isPublic` for Discover. |
| **Card** | Flashcard (`front` / `back`) with FSRS scheduling fields and optional tags. |
| **Tag** | Label linked to cards (M:N). Unlink uses `DELETE` on the association; soft-delete applies to the tag resource via `PATCH`. |
| **Test suite / preset** | Saved assessment configuration: linked subjects plus JSON **selection** (`mode`, `limit`, `shuffle`). |
| **Selection mode** | `ALL` — cards from linked subjects; `DUE_ONLY` — due cards; `RANDOM` — random sample (default limit 20 if unset). |
| **Run** | `POST …/test-suites/{id}/run` returns cards for a session; SRS updates still use card difficulty endpoints when the user rates cards. |
| **FSRS** | Free Spaced Repetition Scheduler (v4.5 weights in `FsrsAlgorithm`). Grades: 1 Again, 2 Hard, 3 Good, 4 Easy. |
| **Due card** | Card whose `nextPracticeTime` is at or before now; fetched via `GET …/cards/due`. |
| **Discover** | Browse public subjects; **clone** copies a subject into the user’s library. |
| **OTP** | One-time password emailed for passwordless login. |
| **Access / refresh token** | JWT pair; refresh state stored in Redis. |
| **Soft delete** | Set `deleted = true` via `PATCH`; row retained. |
| **Space config** | Per-user JSON map on settings (`spaceConfig`) influencing spacing preferences. |
| **Study schedule** | Optional JSON schedule on user settings. |
