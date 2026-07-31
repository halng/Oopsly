# How to troubleshoot local development

## API will not start

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Connection refused to Postgres | DB not running | `cd api && ./gradlew composeUp` |
| Redis connection errors | Redis down | Same; check port `6379` |
| Port `9009` in use | Another process | Stop the other process or change `server.port` |
| Mail / OTP failures | SMTP creds unset | Set `EMAIL_USERNAME` / `EMAIL_PASSWORD`, or use no-op sender if configured for your profile |

## UI cannot reach API

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Network error on device | `localhost` points at the phone | Use host LAN IP in `EXPO_PUBLIC_BACKEND_API` |
| 404 on all routes | Missing context path | Client must hit `{host}/api/v1/oopsly/...` (client appends path automatically) |
| CORS errors (web) | Origin not allowed | Set `ALLOWED_ORIGINS` (default includes `http://localhost:8081`) |

## Auth issues

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| 401 on protected routes | Missing/expired access token | Re-login or call `POST /users/refresh-token` |
| OTP invalid | Expired or wrong code | Request a new OTP via `POST /otp` |

## Tests / CI

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Spotless failures | Formatting | `./gradlew spotlessApply` |
| UI lint failures | ESLint | `pnpm lint` and fix reported files |
| Coverage gate fails | Below Jacoco threshold | Add tests for changed code |

## Media upload

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| “Media upload not configured” | `MEDIA_BUCKET` unset | Set bucket + AWS credentials for the environment, or skip media until S3 is wired |

## Schema surprises

Development uses JPA `ddl-auto: update`. New columns (for example `test_suites.selection`) appear automatically locally. For production cutover, introduce Flyway/Liquibase migrations before freezing the schema (see [Milestone 1](../architecture/MILESTONE_1.md)).
