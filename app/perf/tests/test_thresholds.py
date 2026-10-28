import base64
import json

import jwt
import pytest

from oopsly_perf import thresholds
from oopsly_perf.auth import mint_token, user_id
from oopsly_perf.config import DEFAULT_JWT_SECRET

RULES = {
    "default": {"p95_ms": 500, "max_failure_ratio": 0.0},
    "endpoints": {"GET /slow": {"p95_ms": 2000, "max_failure_ratio": 0.1}},
    "required_endpoints": ["GET /a", "GET /never"],
}


def entry(name, requests=10, failures=0, p95_ms=100):
    return {"name": name, "requests": requests, "failures": failures, "p95_ms": p95_ms}


def test_endpoint_rules_override_the_defaults():
    assert thresholds.limits_for(RULES, "GET /a") == (500, 0.0)
    assert thresholds.limits_for(RULES, "GET /slow") == (2000, 0.1)


def test_flags_slow_and_failing_endpoints():
    results = thresholds.evaluate(
        [entry("GET /a", p95_ms=900), entry("GET /b", failures=1), entry("GET /slow", p95_ms=1500)],
        RULES,
    )
    by_name = {r.name: r for r in results}
    assert by_name["GET /a"].violations == ["p95 900ms > 500ms"]
    assert by_name["GET /b"].violations == ["failures 10.0% > 0.0%"]
    assert by_name["GET /slow"].violations == []


def test_failure_ratio_is_zero_without_requests():
    result = thresholds.evaluate([entry("GET /a", requests=0)], RULES)[0]
    assert result.failure_ratio == 0.0


def test_reports_required_endpoints_that_never_ran():
    entries = [entry("GET /a"), entry("GET /never", requests=0)]
    assert thresholds.missing_endpoints(entries, RULES) == ["GET /never"]


def test_markdown_lists_every_row():
    results = thresholds.evaluate([entry("GET /a"), entry("GET /b", p95_ms=999)], RULES)
    report = thresholds.markdown(results, ["GET /never"])
    assert "| `GET /a` |" in report and "✅" in report
    assert "p95 999ms > 500ms" in report
    assert "never exercised" in report


def test_loads_the_shipped_profiles():
    for profile in ("smoke", "regression"):
        rules = thresholds.load(profile)
        assert rules["default"]["p95_ms"] > 0
        assert "GET /v1/ping" in rules["required_endpoints"]
    with pytest.raises(KeyError):
        thresholds.load("nope")


def test_shipped_profiles_only_override_required_endpoints_that_exist():
    config = json.loads(thresholds.THRESHOLDS_FILE.read_text())
    for rules in config["profiles"].values():
        assert set(rules["endpoints"]) <= set(rules["required_endpoints"])


def test_minted_tokens_match_what_the_api_verifies():
    token = mint_token("a@b.c", DEFAULT_JWT_SECRET, plan="PRO")
    key = base64.b64decode(DEFAULT_JWT_SECRET)
    claims = jwt.decode(token, key, algorithms=["HS384"])
    assert claims["id"] == user_id("a@b.c")
    assert claims["plan"] == "PRO"
    assert claims["role"] == "USER"
    assert claims["sub"] == "a@b.c"
    assert user_id("a@b.c") != user_id("x@b.c")
