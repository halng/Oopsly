# Product overview

**Oopsly** is a cross-platform learning app focused on **active recall** and **spaced repetition**. The working product metaphor is “Quizlet meets Anki”: approachable library and study UX, with FSRS-backed scheduling under the hood.

---

## Goals (current direction)

- Help learners manage knowledge through hierarchical libraries (shelves → subjects → cards)
- Drive retention with due-card queues and FSRS scheduling
- Support assessment presets (test suites) that select cards for practice runs
- Allow discovery and cloning of public subjects
- Sync profile, settings, and light gamification signals (streaks, XP)

Milestone definition: [Milestone 1](../architecture/MILESTONE_1.md).

---

## What works today (code-backed)

| Area | Capability |
| ---- | ---------- |
| Auth | Email OTP → JWT (Google flagged off by default) |
| Library | CRUD shelves, subjects, cards (soft delete) |
| Study | Due cards, difficulty updates, FSRS fields |
| Tags | Create, link/unlink, filter cards by tag |
| Media | Attach media to cards |
| Assessment | Test suite presets, selection JSON, run API, questions |
| Discover | Browse public content, clone subject |
| Profile | Profile + theme/language/space settings |
| Stats | User stats endpoint + stats screen |
| Leaderboard | **UI preview only** (demo neighbors; no leaderboard API yet) |
| Client surfaces | Home, discover, settings, profile, stats, leaderboard preview, take-test, shelf/subject dynamic routes, learn/review/match screens |
| Media upload | Endpoint exists; needs `MEDIA_BUCKET` (otherwise stub message) |

---

## What is aspirational (do not treat as shipped)

The root README historically listed AI document upload, Pomodoro, goal tracker, notes, and full AI question generation as product features. Treat those as **roadmap / research** unless a screen and API exist and are wired end-to-end. Spring AI dependencies are largely commented out in `build.gradle`.

Authoritative research background: [EdTech_RESEARCH.md](../EdTech_RESEARCH.md). Feature OKRs: [features/](../features/).

---

## Platforms

| Platform | Support |
| -------- | ------- |
| iOS | Expo / RN (`com.huami.oopsly`) |
| Android | Expo / RN (`com.huami.oopsly`) |
| Web | Expo web (static output) |

---

## Design language

See [Theme & colors](../design/theme.md).
