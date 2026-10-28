# Oopsly performance tests

[Locust](https://locust.io) suite for the API in `app/api`. One simulated user seeds its own
shelf, subject, cards, test and questions, then calls **every endpoint once** (reads, writes,
grading, garden, communities, live quiz room, discover) and soft-deletes what it created.
Each endpoint gets its own statistics row, named after its path template.

When a run ends, the statistics are checked against `oopsly_perf/thresholds.json`. Locust exits
non-zero if an endpoint is slower than its p95 limit, fails too often, or was never called, and
`results/summary.md` holds the per-endpoint table.

| Profile | Where it runs | Load | Limits |
| :--- | :--- | :--- | :--- |
| `smoke` | `app/perf` in CI (`.github/workflows/ci-perf.yaml`) | 2 users, 45 s | p95 2 s, 0 failures |
| `regression` | `app/api`: `./gradlew perfRegressionTest` (CI: `ci-api.yaml`) | 10 users, 60 s in CI | p95 800 ms, 1 % failures |

## Run the smoke test locally

```bash
# 1. infrastructure + API (from app/api)
docker compose -f ../docker-compose.yml up -d postgres redis
./gradlew bootRun -Pprofile=test

# 2. Locust (from app/perf)
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q tests                # unit tests of the perf helpers
PERF_PROFILE=smoke locust -f locustfile.py --headless -u 2 -r 2 -t 45s --csv results/smoke
```

Drop `--headless` to use the web UI on http://localhost:8089.

## Run the regression test locally

Needs Docker. Postgres 15 (with the Flyway migrations), Redis and the Locust image are started by
Testcontainers; the app runs in the test JVM on a random port.

```bash
cd app/api
PERF_USERS=20 PERF_DURATION=2m ./gradlew perfRegressionTest   # both optional
```

The report lands in `app/api/build/reports/perf/summary.md`.

## Settings

| Variable | Default | Meaning |
| :--- | :--- | :--- |
| `PERF_HOST` | `http://localhost:9009/api/oopsly` | API base URL (`--host` also works) |
| `PERF_PROFILE` | `smoke` | `smoke` or `regression` (selects the thresholds) |
| `PERF_JWKS_PORT` | `9099` | Port where Locust serves the JWKS the API verifies tokens with (`0` disables) |
| `PERF_RESULTS_DIR` | `results` | Where `summary.md` is written |
| `PERF_RUN_ID` | process id | Keeps seeded names unique between runs |

Tokens are signed RS256 (same claims as the auth service) with a key generated per Locust process,
and the matching JWKS is served on `PERF_JWKS_PORT`. The API's perf profile points `app.jwt.jwks-url`
there, so the auth service does not need to run. Do not use `--processes` (each worker would generate
a different key).

## Adding or tuning an endpoint

1. Add a `@task` to `oopsly_perf/sweep.py` that uses `self.call(METHOD, "/path/{template}", ...)`.
   Use `expect=` for statuses that are a valid outcome (for example `400` when a garden plot is
   not affordable yet).
2. Add `"METHOD /path/{template}"` to `required_endpoints` in `oopsly_perf/thresholds.json` for
   each profile, and a per-endpoint limit under `endpoints` if the default does not fit.

## Not covered

- Websocket traffic of the live quiz (`/ws`): Locust drives HTTP only. The room creation
  endpoint is covered.
- `POST .../cards/{cardId}/media` (needs file storage) and `POST /communities/{id}/invite`
  (needs the auth service).
- `POST /garden/plants/water` only runs when the garden already has a planted tree.
