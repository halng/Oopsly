# Oopsly API

Spring Boot 3.5.8 / Java 21 REST API for Oopsly.

## Run locally

```bash
./gradlew composeUp          # Postgres + Redis
./gradlew bootRun -Pprofile=test   # loads api/.env.test if present; NoOp email
# or: ./gradlew bootRun      # loads api/.env (profile default "prod" for env file name)
```

- Base URL: `http://localhost:9009/api/v1/oopsly`
- Swagger: `/swagger-ui/index.html` under that context

Stop infra: `./gradlew composeDown`

## Tests

```bash
./gradlew test              # unit tests (com.app.oopsly.api.unit.*)
./gradlew integrationTest   # integration tests (com.app.oopsly.api.integration.*)
```

## Docs

- [Getting started](../docs/tutorials/getting-started.md)
- [API reference](../docs/reference/api.md)
- [Environment variables](../docs/reference/environment.md)
- [Commands](../docs/reference/commands.md)
