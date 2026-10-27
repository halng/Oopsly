"""Settings read from the environment so CI and local runs share one locustfile."""

import os

# Same default as app/api/src/main/resources/application.yaml (shared with the auth service).
DEFAULT_JWT_SECRET = "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"


def jwt_secret() -> str:
    return os.environ.get("PERF_JWT_SECRET", DEFAULT_JWT_SECRET)


def profile() -> str:
    """`smoke` (a quick pass over every endpoint) or `regression` (sustained load)."""
    return os.environ.get("PERF_PROFILE", "smoke")


def results_dir() -> str:
    return os.environ.get("PERF_RESULTS_DIR", "results")
