# Architecture

Oopsly is a cross-platform flashcard / spaced-repetition product with a React Native (Expo) client and a Spring Boot REST API backed by PostgreSQL and Redis.

---

## High-level view

```text
┌──────────────────────────────────────────┐
│  Client                                  │
│  React Native 0.81 + Expo 54             │
│  NativeWind 4 · Expo Router · Zustand    │
└──────────────────┬───────────────────────┘
                   │ HTTPS / REST + JWT
┌──────────────────▼───────────────────────┐
│  API                                     │
│  Spring Boot 3.5.8 · Java 21             │
│  Controllers → Services → Repositories   │
│  Spring Security · SpringDoc OpenAPI     │
│  Resilience4j · Caffeine cache           │
└──────────┬─────────────────┬─────────────┘
           │                 │
    ┌──────▼──────┐   ┌──────▼──────┐
    │ PostgreSQL  │   │    Redis    │
    │  (JPA)      │   │ (refresh /  │
    │             │   │  session)   │
    └─────────────┘   └─────────────┘
```

Context path: `/api/v1/oopsly` on port **9009** by default.

---

## Technology stack (current)

### Client (`ui/`)

| Concern | Choice |
| ------- | ------ |
| Framework | React Native 0.81.5, React 19.1 |
| Platform | Expo 54 (new architecture enabled) |
| Routing | Expo Router 6 |
| Styling | NativeWind 4.2 |
| State | Zustand 4.5 |
| HTTP | Axios |
| UI kit | Gluestack UI 3 |
| Tests | Jest + React Testing Library; Cypress available |
| Package manager | pnpm |

### API (`api/`)

| Concern | Choice |
| ------- | ------ |
| Framework | Spring Boot 3.5.8 |
| Language | Java 21 (virtual threads enabled) |
| Persistence | Spring Data JPA + PostgreSQL |
| Security | Spring Security + JWT |
| Cache | Caffeine |
| Session / refresh | Redis |
| API docs | springdoc-openapi 2.8 |
| Resilience | Resilience4j |
| Format | Spotless |
| Coverage | Jacoco |
| Native image | GraalVM buildtools plugin present |

### Data stores

| Store | Role |
| ----- | ---- |
| PostgreSQL 15 | System of record (compose image `postgres:15.4`) |
| Redis | Refresh-token / session-related state |

Schema evolution in development: Hibernate `ddl-auto: update`. Production should introduce Flyway/Liquibase before cutover ([Milestone 1](../architecture/MILESTONE_1.md)).

---

## Layering

| Layer | Package / folder | Responsibility |
| ----- | ---------------- | -------------- |
| Controllers | `…api.controller` | HTTP routing, OpenAPI annotations, validation |
| Services | `…api.service` | Business rules, OTP, FSRS updates, ownership checks |
| Repositories | `…api.repository` | Spring Data access |
| Entities | `…api.entity` | JPA models (`Audit` base: id, timestamps, `deleted`) |
| View models | `…api.viewmodel` | Request/response DTOs, `ApiRes` |
| Config | `…api.config` | Security, JWT filter, CORS |
| Client screens | `ui/app`, `ui/screen` | Routes and study UIs |
| Client services | `ui/services` | Typed API access |

---

## Domain hierarchy

```text
User
 └── Shelf (library container)
      ├── Subject (deck / topic; optional parent subject)
      │    └── Card (front/back + FSRS fields + tags)
      └── TestSuite (assessment preset + selection JSON)
           └── Question (optional structured questions)
```

Discover exposes **public subjects** that authenticated users can **clone** into their own shelves.

---

## Cross-cutting concerns

| Concern | Approach |
| ------- | -------- |
| AuthN | Email OTP → JWT access + refresh |
| AuthZ | Authenticated user owns shelves/subjects; public discover for shared content |
| Soft delete | `Audit.deleted`; mutate via `PATCH` |
| CORS | `app.allowed-origins` |
| Observability | Spring Actuator (`/actuator/health`); structured logging |
| Circuit breaking | Resilience4j instances per service area |

---

## Repository layout

```text
Oopsly/
├── api/                 # Spring Boot backend
├── ui/                  # Expo / React Native frontend
├── docs/                # This documentation
├── .github/workflows/   # CI / CD
├── AGENTS.md            # Agent instructions
└── README.md            # Project entrypoint
```

---

## Deployment shape

**Local:** Docker Compose for Postgres + Redis; `./gradlew bootRun`; Expo for UI.

**CI:** GitHub Actions (`.github/workflows/ci.yaml`) runs `.github/workflows/ci.sh` (Java 21, Node 20, Gradle build/test/spotless, UI checks).

**Production:** See [CI / CD](../operations/ci-cd.md). API images are built with Spring Boot **`bootBuildImage`** to GHCR; UI via EAS. Treat cloud hosting topology as evolving; verify against current deploy scripts.

---

## Related docs

- [Data model](./data-model.md)
- [Authentication](./authentication.md)
- [SRS / FSRS](./srs.md)
- [API reference](../reference/api.md)
- [Milestone 1](../architecture/MILESTONE_1.md)
