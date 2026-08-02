# Screens & routes

Expo Router file routes live under `ui/app/`. Heavier study UIs live under `ui/screen/`.

---

## App routes

| Route file | Role |
| ---------- | ---- |
| `app/index.tsx` | Entry / landing |
| `app/onboard.tsx` | Onboarding |
| `app/verification.tsx` | OTP verification |
| `app/(user)/home.tsx` | Authenticated home / library hub |
| `app/(user)/discover.tsx` | Discover public content |
| `app/(user)/profile.tsx` | Profile |
| `app/(user)/settings.tsx` | Settings |
| `app/(user)/stats.tsx` | Statistics |
| `app/(user)/leaderboard.tsx` | Leaderboard (**preview** — demo data until a leaderboard API exists) |
| `app/(user)/take-test/[testSuiteId].tsx` | Run a test suite (modal) |
| `app/(user)/[shelfId]/[action]/[id].tsx` | Dynamic shelf/subject/card actions |

User stack options are defined in `app/(user)/_layout.tsx` (headers hidden; modal presentation for take-test).

---

## Study screens (`ui/screen/`)

| Screen | Role |
| ------ | ---- |
| `SubjectViewDetailsScreen` | Subject detail |
| `FlashCardReviewScreen` | Active recall session |
| `FlashCardReviewCompleteScreen` | Session complete |
| `LearnModeScreen` | Learn mode |
| `MatchingGameScreen` | Matching game mode |
| `DiscoverScreen` | Discover UI surface |
| `StatsScreen` | Charts / stats presentation |
| `LeaderboardScreen` | Leaderboard presentation (explicit “preview” banner; placeholder rows) |

---

## Navigation mental model (M1)

```text
Onboard / OTP
    → Home (hub)
        → Shelf / Subject detail
            → Review (due cards) / Learn modes
            → Test suite run
        → Discover → Clone
        → Stats / Leaderboard / Profile / Settings
```
