"""Locust entry point.

Smoke:      PERF_PROFILE=smoke      locust -f locustfile.py --headless -u 2  -r 2 -t 45s
Regression: PERF_PROFILE=regression locust -f locustfile.py --headless -u 20 -r 5 -t 2m

`--host` (or PERF_HOST) points at the API, e.g. http://localhost:9009/api/oopsly.
When the run ends the statistics are compared with oopsly_perf/thresholds.json and Locust
exits non-zero if an endpoint is too slow, fails, or was never exercised.
"""

import itertools
import logging
import os
from pathlib import Path

from locust import HttpUser, between, events

from oopsly_perf import config, thresholds
from oopsly_perf.auth import mint_token
from oopsly_perf.sweep import ApiSweep

log = logging.getLogger("oopsly_perf")
_user_numbers = itertools.count(1)
_run_id = os.environ.get("PERF_RUN_ID", str(os.getpid()))


class OopslyUser(HttpUser):
    host = os.environ.get("PERF_HOST", "http://localhost:9009/api/oopsly")
    wait_time = between(0.1, 0.5)
    tasks = [ApiSweep]

    def on_start(self):
        number = next(_user_numbers)
        self.counter = itertools.count(1)
        self.suffix = f"{_run_id}-{number}-{id(self) % 10_000}"
        secret = config.jwt_secret()

        def token(role: str) -> str:
            return mint_token(f"perf-{role}-{_run_id}-{number}@oopsly.dev", secret)

        self.token = token("owner")
        self.other_token = token("member")
        self.third_token = token("guest")


def _entries(stats) -> list:
    return [
        {
            "name": f"{entry.method} {entry.name}",
            "requests": entry.num_requests,
            "failures": entry.num_failures,
            "p95_ms": entry.get_response_time_percentile(0.95) or 0,
        }
        for entry in stats.entries.values()
    ]


@events.quitting.add_listener
def check_thresholds(environment, **_kwargs):
    rules = thresholds.load(config.profile())
    entries = _entries(environment.stats)
    results = thresholds.evaluate(entries, rules)
    missing = thresholds.missing_endpoints(entries, rules)
    report = thresholds.markdown(results, missing)

    out = Path(config.results_dir())
    out.mkdir(parents=True, exist_ok=True)
    (out / "summary.md").write_text(report)

    failed = [r for r in results if r.violations]
    if failed or missing:
        for result in failed:
            log.error("%s: %s", result.name, "; ".join(result.violations))
        for name in missing:
            log.error("%s: never exercised", name)
        environment.process_exit_code = 1
    else:
        log.info("All %d endpoints are within the %s thresholds", len(results), config.profile())
