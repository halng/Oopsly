"""Settings read from the environment so CI and local runs share one locustfile."""

import os



def jwks_port() -> int:
    """Port serving the public key to the API (matches app.jwt.jwks-url in application-perf.yaml)."""
    return int(os.environ.get("PERF_JWKS_PORT", "9099"))


def profile() -> str:
    """`smoke` (a quick pass over every endpoint) or `regression` (sustained load)."""
    return os.environ.get("PERF_PROFILE", "smoke")


def results_dir() -> str:
    return os.environ.get("PERF_RESULTS_DIR", "results")
