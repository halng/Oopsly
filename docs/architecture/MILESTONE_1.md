# Milestone 1 — Functional core (Quizlet meets Anki)

This document reconciles **product scope** with the material in [docs/features/001/](../features/001/).

## How this relates to `features/001`

- [OKR.md](../features/001/OKR.md) and [TODO.md](../features/001/TODO.md) focus on **discovery, prototypes, and UX validation** (navigation, cognitive load, progressive disclosure).
- **Milestone 1 (this doc)** is the **first shippable slice** of behavior: OTP auth, shelf library, subjects and cards, SRS study loop, **saved test presets** with a **run** API that returns flashcards, and settings/profile sync layered on the architecture in [ARCHITECTURE.md](../ARCHITECTURE.md).

The UX OKRs are satisfied by implementing that slice with **clear IA** (hub → library → study vs test) and polished auth/onboarding, not by deferring features until a separate “M2.”

## Authentication (M1)

- **Primary path:** email → OTP → JWT access + Redis-backed refresh (see API `POST /otp`, `POST /otp/validate`, `POST /users/refresh-token`).
- Email/password is **not** required for M1 unless explicitly added later.

## Assessment presets (OOPS-31)

- A **test suite** row is a **preset**: linked subjects plus JSON **selection** (`mode`, `limit`, `shuffle`).
- **Run:** `POST /shelves/{shelveId}/test-suites/{id}/run` returns cards for a read-only session; SRS updates still use the normal card review endpoints when the user rates cards during study.

## Schema evolution

New columns such as `test_suites.selection` (`jsonb`) are applied via JPA **`ddl-auto: update`** in development ([application.yaml](../../api/src/main/resources/application.yaml)). Add Flyway/Liquibase migrations before production cutover if you freeze schema tooling.

## References

- System stack and layers: [ARCHITECTURE.md](../ARCHITECTURE.md)
- Agent conventions: [AGENTS.md](../../AGENTS.md)
