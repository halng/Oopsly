# Oopsly Documentation

Technical documentation for **Oopsly** — a cross-platform flashcard and spaced-repetition (SRS) learning app.

This library follows the [Diátaxis](https://diataxis.fr/) framework: tutorials to get you started, how-to guides for specific tasks, reference for lookup, and explanation for understanding.

---

## Start here

| Audience | Go to |
| -------- | ----- |
| New contributor | [Getting started](./tutorials/getting-started.md) |
| API consumer | [API reference](./reference/api.md) |
| Architect / tech lead | [Architecture](./explanation/architecture.md) |
| Product / design | [Product overview](./product/overview.md) |

---

## Tutorials

*Learning-oriented — follow along end to end*

| Document | Description |
| -------- | ----------- |
| [Getting started](./tutorials/getting-started.md) | Install prerequisites, run Postgres/Redis, boot API + UI |

---

## How-to guides

*Task-oriented — solve a concrete problem*

| Document | Description |
| -------- | ----------- |
| [Contribute](./how-to/contribute.md) | Branching, commits, checks before PR |
| [Run the API](./how-to/run-api.md) | Boot Spring Boot locally or in Docker |
| [Run the UI](./how-to/run-ui.md) | Start Expo / React Native client |
| [Troubleshoot](./how-to/troubleshoot.md) | Common local-dev failures |

---

## Reference

*Information-oriented — look up facts*

| Document | Description |
| -------- | ----------- |
| [API reference](./reference/api.md) | REST endpoints, auth, response envelope |
| [Environment variables](./reference/environment.md) | Config for API and UI |
| [Commands](./reference/commands.md) | Build, test, lint, format |
| [Conventions](./reference/conventions.md) | Soft deletes, DI, testIDs, licenses, commits |
| [OpenAPI / Swagger](./reference/api.md#interactive-docs) | Live schema at runtime |

---

## Explanation

*Understanding-oriented — concepts and rationale*

| Document | Description |
| -------- | ----------- |
| [Architecture](./explanation/architecture.md) | Layers, stack, deployment shape |
| [Data model](./explanation/data-model.md) | Entities and relationships |
| [Authentication](./explanation/authentication.md) | OTP → JWT flow |
| [SRS / FSRS](./explanation/srs.md) | Spaced repetition design |
| [Milestone 1](./architecture/MILESTONE_1.md) | First shippable product slice |

> Legacy path: [`ARCHITECTURE.md`](./ARCHITECTURE.md) redirects conceptually to [`explanation/architecture.md`](./explanation/architecture.md). Prefer the explanation doc for current accuracy.

---

## Product & design

| Document | Description |
| -------- | ----------- |
| [Product overview](./product/overview.md) | Vision, scope, current capabilities |
| [Glossary](./product/glossary.md) | Shelf, subject, FSRS, presets, … |
| [Screens](./product/screens.md) | App routes and study surfaces |
| [Theme & colors](./design/theme.md) | Visual tokens |
| [Features (BDD / OKRs)](./features/README.md) | Milestone feature packs |
| [EdTech research](./EdTech_RESEARCH.md) | Market & cognitive-science background |
| [CI / CD](./operations/ci-cd.md) | GitHub Actions, GHCR, EAS |
| [API package README](../api/README.md) | Thin backend entry |
| [UI package README](../ui/README.md) | Thin frontend entry |

---

## Agent & contributor tooling

| Document | Description |
| -------- | ----------- |
| [AGENTS.md](../AGENTS.md) | Instructions for coding agents |
| [Cursor agents](../.cursor/agents/README.md) | Specialized agent roles |

---

## Document status

Docs describe **what exists in the repository today**. Planned work is labeled *(planned)* or lives under milestone / OKR files. If code and docs disagree, trust the code and open an issue to fix the docs.
