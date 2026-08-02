# How to run the API

## Local (`bootRun`)

```bash
cd api
./gradlew composeUp
./gradlew bootRun -Pprofile=test    # loads .env.test; NoOp email
# ./gradlew bootRun                 # loads .env (env-loader default name "prod")
```

Server listens on **port 9009** with context path `/api/v1/oopsly`.

Requires PostgreSQL and Redis (see [Getting started](../tutorials/getting-started.md)).

## Infrastructure only

```bash
cd api
./gradlew composeUp
./gradlew composeDown    # stop + remove volumes
```

## Build without tests

```bash
cd api
./gradlew clean build -x test
```

## Profiles

| File | Role |
| ---- | ---- |
| `application.yaml` | Default local config |
| `application-test.yaml` | Test profile |
| `application-sit.yaml` | SIT profile |

Override with Spring profiles or environment variables listed in [Environment variables](../reference/environment.md).

## Useful URLs

| URL | Purpose |
| --- | ------- |
| `http://localhost:9009/api/v1/oopsly/actuator/health` | Health |
| `http://localhost:9009/api/v1/oopsly/swagger-ui/index.html` | Swagger UI |
| `http://localhost:9009/api/v1/oopsly/api-docs` | OpenAPI JSON |
