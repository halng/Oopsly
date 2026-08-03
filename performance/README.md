# Backend performance tests

Start the API without authentication checks using `cd api && ./gradlew bootRun -Pprofile=perf`, then run one of the k6 profiles:

```bash
k6 run -e TEST_PROFILE=smoke performance/k6/backend.js
k6 run -e TEST_PROFILE=flaky performance/k6/backend.js
k6 run -e TEST_PROFILE=stress performance/k6/backend.js
k6 run -e TEST_PROFILE=spike performance/k6/backend.js
```

Every profile reports request failure rate, p90/p95/p99 duration, and check rate. The `flaky` profile is a repeatability test intended for comparing multiple CI runs.
