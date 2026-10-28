"""Pass/fail rules applied to the Locust statistics when a run ends."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

THRESHOLDS_FILE = Path(__file__).with_name("thresholds.json")


@dataclass(frozen=True)
class Result:
    name: str
    requests: int
    failures: int
    p95_ms: float
    limit_p95_ms: float
    limit_failure_ratio: float

    @property
    def failure_ratio(self) -> float:
        return self.failures / self.requests if self.requests else 0.0

    @property
    def violations(self) -> list[str]:
        problems = []
        if self.p95_ms > self.limit_p95_ms:
            problems.append(f"p95 {self.p95_ms:.0f}ms > {self.limit_p95_ms:.0f}ms")
        if self.failure_ratio > self.limit_failure_ratio:
            problems.append(
                f"failures {self.failure_ratio:.1%} > {self.limit_failure_ratio:.1%}"
            )
        return problems


def load(profile: str, path: Path = THRESHOLDS_FILE) -> dict[str, Any]:
    config = json.loads(path.read_text())
    if profile not in config["profiles"]:
        raise KeyError(f"Unknown perf profile '{profile}', expected one of {sorted(config['profiles'])}")
    return config["profiles"][profile]


def limits_for(rules: dict[str, Any], endpoint: str) -> tuple[float, float]:
    """p95 limit (ms) and failure-ratio limit for one endpoint; per-endpoint rules win."""
    merged = {**rules["default"], **rules.get("endpoints", {}).get(endpoint, {})}
    return float(merged["p95_ms"]), float(merged["max_failure_ratio"])


def evaluate(entries: list[dict[str, Any]], rules: dict[str, Any]) -> list[Result]:
    """`entries` hold name, requests, failures and p95_ms for each endpoint row."""
    results = []
    for entry in entries:
        p95_limit, failure_limit = limits_for(rules, entry["name"])
        results.append(
            Result(
                name=entry["name"],
                requests=entry["requests"],
                failures=entry["failures"],
                p95_ms=entry["p95_ms"],
                limit_p95_ms=p95_limit,
                limit_failure_ratio=failure_limit,
            )
        )
    return results


def missing_endpoints(entries: list[dict[str, Any]], rules: dict[str, Any]) -> list[str]:
    """Endpoints the profile requires that never produced a request."""
    seen = {entry["name"] for entry in entries if entry["requests"] > 0}
    return [name for name in rules.get("required_endpoints", []) if name not in seen]


def markdown(results: list[Result], missing: list[str]) -> str:
    lines = [
        "| Endpoint | Requests | Failures | p95 (ms) | Limit (ms) | Status |",
        "| :--- | ---: | ---: | ---: | ---: | :--- |",
    ]
    for result in sorted(results, key=lambda r: r.name):
        status = "✅" if not result.violations else "❌ " + "; ".join(result.violations)
        lines.append(
            f"| `{result.name}` | {result.requests} | {result.failures} | "
            f"{result.p95_ms:.0f} | {result.limit_p95_ms:.0f} | {status} |"
        )
    for name in missing:
        lines.append(f"| `{name}` | 0 | 0 | - | - | ❌ never exercised |")
    return "\n".join(lines) + "\n"
