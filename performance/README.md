# Backend performance tests

Set `BASE_URL` to the deployed API endpoint (must include `/api/v1/oopsly`) and run one of the k6 profiles:

```bash
k6 run -e BASE_URL="https://your-api-host/api/v1/oopsly" -e TEST_PROFILE=smoke api/src/test/perf/k6/backend.js
k6 run -e BASE_URL="https://your-api-host/api/v1/oopsly" -e TEST_PROFILE=flaky api/src/test/perf/k6/backend.js
k6 run -e BASE_URL="https://your-api-host/api/v1/oopsly" -e TEST_PROFILE=stress api/src/test/perf/k6/backend.js
k6 run -e BASE_URL="https://your-api-host/api/v1/oopsly" -e TEST_PROFILE=spike api/src/test/perf/k6/backend.js
```

Every profile reports request failure rate, p90/p95/p99 duration, and check rate. The `flaky` profile is a repeatability test intended for comparing multiple CI runs.
