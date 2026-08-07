# Oopsly

[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=Oopsly%3A%3AAPI)](https://sonarcloud.io/summary/new_code?id=Oopsly%3A%3AAPI)

[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=Oopsly%3A%3AUI)](https://sonarcloud.io/summary/new_code?id=Oopsly%3A%3AUI)

[![CodeQL - Snyk](https://github.com/halng/Oopsly/actions/workflows/codeql-snyk.yaml/badge.svg?branch=main)](https://github.com/halng/Oopsly/actions/workflows/codeql-snyk.yaml)

Cross-platform **flashcard** and **spaced repetition (SRS)** app — approachable study UX with FSRS-backed scheduling.

| Layer | Stack |
| ----- | ----- |
| Client | React Native 0.81.5 · Expo 54 · NativeWind 4.2 (`ui/`) |
| API | Spring Boot 3.5.8 · Java 21 (`api/`) |
| Data | PostgreSQL · Redis |

---

## Documentation

📘 **[Documentation index](./docs/README.md)** (Diátaxis: tutorials · how-to · reference · explanation)

| Start here | Link |
| ---------- | ---- |
| Local setup | [Getting started](./docs/tutorials/getting-started.md) |
| REST API | [API reference](./docs/reference/api.md) |
| System design | [Architecture](./docs/explanation/architecture.md) |
| Product scope | [Product overview](./docs/product/overview.md) |
| Milestone 1 | [MILESTONE_1](./docs/architecture/MILESTONE_1.md) |
| Agent rules | [AGENTS.md](./AGENTS.md) |

---

## Quick start

### Infrastructure + API

```bash
cd api
./gradlew composeUp
./gradlew bootRun -Pprofile=test
```

- Base URL: `http://localhost:9009/api/v1/oopsly`
- Swagger: `http://localhost:9009/api/v1/oopsly/swagger-ui/index.html`

### UI

```bash
cd ui
pnpm install
pnpm start
```

Set `EXPO_PUBLIC_BACKEND_API=http://localhost:9009` and other env in `ui/.env`.

Full walkthrough: [docs/tutorials/getting-started.md](./docs/tutorials/getting-started.md).

---

## Current capabilities

- Email OTP authentication → JWT access / refresh
- Shelves → subjects → cards (soft delete via `PATCH`)
- Due-card study with **FSRS-4.5** scheduling
- Tags, card media, subject settings
- Test suite presets with selection + `run` API
- Discover / clone public subjects
- Profile, settings, stats, leaderboard surfaces

Roadmap ideas (AI generation, Pomodoro, goals, etc.) are tracked under [`docs/features/`](./docs/features/) and research docs — not all are shipped.

---

## Development checks

```bash
# API
cd api && ./gradlew spotlessApply test

# UI
cd ui && pnpm lint && pnpm test
```

Contributing: [docs/how-to/contribute.md](./docs/how-to/contribute.md)  
Conventions: [docs/reference/conventions.md](./docs/reference/conventions.md)

---

## License

Licensed under the Apache License 2.0. See source file headers (author: Hao Nguyen Tan).
