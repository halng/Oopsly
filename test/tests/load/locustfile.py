#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License. You may use, copy, modify, merge, publish, distribute,
#  sublicense, and/or sell copies of the Software, subject to the following conditions:
#
#  1. The above copyright notice and this permission notice shall be included
#     in all copies or substantial portions of the Software.
#  2. The Software is provided "as is," without warranty of any kind, express or
#     implied, including but not limited to the warranties of merchantability,
#     fitness for a particular purpose, and noninfringement.
#  3. The authors or copyright holders shall not be liable for any claim, damages,
#     or other liability, whether in an action of contract, tort, or otherwise,
#     arising from, out of, or in connection with the Software.

# from locust import HttpUser, task, between
#
# # New imports
# import os
# import sys
# import yaml
# import random
# import re
# import time
#
#
# def _load_api_config():
#     """Load api.yaml and return (env, apis_dict)."""
#     cfg_path = os.path.abspath(
#         os.path.join(os.path.dirname(__file__), "..", "config", "api.yaml")
#     )
#     if not os.path.exists(cfg_path):
#         # fallback: try relative to tests/integration
#         cfg_path = os.path.abspath(
#             os.path.join(os.path.dirname(__file__), "..", "..", "config", "api.yaml")
#         )
#     with open(cfg_path, "r") as fh:
#         data = yaml.safe_load(fh)
#     configs = data.get("configs", {})
#     environments = configs.get("environments", {})
#     apis_list = configs.get("apis", [])
#     apis = {api["name"]: api for api in apis_list if "name" in api}
#     return environments, apis
#
#
# _VAR_PATTERN = re.compile(r"\$\{?(\w+)\}?")  # matches $VAR and ${VAR}
#
#
# def _collect_placeholder_vars(apis: dict):
#     """Scan API definitions to find all placeholder variable names."""
#     vars_found = set()
#     for api in apis.values():
#         def scan(obj):
#             if isinstance(obj, str):
#                 for m in _VAR_PATTERN.finditer(obj):
#                     vars_found.add(m.group(1))
#             elif isinstance(obj, dict):
#                 for v in obj.values():
#                     scan(v)
#             elif isinstance(obj, list):
#                 for item in obj:
#                     scan(item)
#         scan(api.get("endpoint", ""))
#         scan(api.get("headers", {}))
#         scan(api.get("body", {}))
#         scan(api.get("query-params", {}))
#     return vars_found
#
#
# def _make_seed_context(vars_found: set):
#     """Create sensible default values for common placeholders."""
#     ctx = {}
#     rand = random.randint(1000, 9999)
#     for v in vars_found:
#         # Common-name heuristics
#         name = v.lower()
#         if "email" in name:
#             ctx[v] = f"loadtest+{int(time.time()) % 10000}+{rand}@example.com"
#         elif "token" in name or "auth" in name:
#             ctx[v] = f"fake-token-{rand}"
#         elif "id" in name or name.endswith("_id"):
#             ctx[v] = str(random.randint(1, 1000))
#         elif "page" in name or "size" in name:
#             ctx[v] = 1
#         elif "otp" in name:
#             ctx[v] = "000000"
#         elif "cards" in name or "array" in name or "updates" in name:
#             ctx[v] = []
#         else:
#             ctx[v] = f"lt-{v.lower()}-{rand}"
#     return ctx
#
#
# # Prepare API definitions & initial context at import time
# ENVIRONMENTS, APIS = _load_api_config()
# PLACEHOLDERS = _collect_placeholder_vars(APIS)
# SEED_CONTEXT = _make_seed_context(PLACEHOLDERS)
#
# # --- New: CI thresholds (can be configured via environment variables) ---
# CI_MAX_FAILURE_RATE_PCT = float(os.getenv("CI_MAX_FAILURE_RATE_PCT", "1.0"))  # percent
# CI_MAX_AVG_MS = float(os.getenv("CI_MAX_AVG_MS", "500"))  # milliseconds
# CI_MAX_P95_MS = float(os.getenv("CI_MAX_P95_MS", "1000"))  # milliseconds
# CI_MIN_REQUESTS = int(os.getenv("CI_MIN_REQUESTS", "50"))  # avoid noisy small-sample results
#
# # --- New: helper to extract metrics from Locust stats object robustly ---
# def _extract_total_stats(environment):
#     """
#     Try to obtain a 'total' stats entry from the environment in a few ways
#     (to be compatible with different Locust versions). Return a dict with:
#       - num_requests
#       - num_failures
#       - avg_response_time (ms)
#       - p95 (ms) or None if not available
#     """
#     stats_collector = None
#     # prefer runner.stats if available
#     if hasattr(environment, "runner") and getattr(environment, "runner") is not None:
#         stats_collector = getattr(environment.runner, "stats", None) or getattr(environment, "stats", None)
#     else:
#         stats_collector = getattr(environment, "stats", None)
#
#     total = None
#     if stats_collector is None:
#         return {"num_requests": 0, "num_failures": 0, "avg_ms": 0.0, "p95_ms": None}
#
#     # common attribute
#     if hasattr(stats_collector, "total"):
#         total = stats_collector.total
#     else:
#         # fallback: try dictionary-like access
#         try:
#             total = stats_collector.get("Total")  # some versions expose get("Total")
#         except Exception:
#             total = None
#
#     # If still None, attempt to derive totals by summing entries
#     if total is None:
#         num_requests = 0
#         num_failures = 0
#         sum_resp_time = 0.0
#         total_count_for_avg = 0
#         # try to iterate collector entries
#         try:
#             entries = getattr(stats_collector, "entries", None) or getattr(stats_collector, "_entries", None) or {}
#             for entry in (entries.values() if hasattr(entries, "values") else []):
#                 nr = getattr(entry, "num_requests", None) or getattr(entry, "num_reqs", None) or 0
#                 nf = getattr(entry, "num_failures", None) or getattr(entry, "num_errors", None) or 0
#                 art = getattr(entry, "avg_response_time", None) or getattr(entry, "avg_response_time_ms", None) or None
#                 if art is not None and nr:
#                     sum_resp_time += float(art) * int(nr)
#                     total_count_for_avg += int(nr)
#                 num_requests += int(nr)
#                 num_failures += int(nf)
#             avg_ms = (sum_resp_time / total_count_for_avg) if total_count_for_avg else 0.0
#             return {"num_requests": num_requests, "num_failures": num_failures, "avg_ms": avg_ms, "p95_ms": None}
#         except Exception:
#             return {"num_requests": 0, "num_failures": 0, "avg_ms": 0.0, "p95_ms": None}
#
#     # Read commonly-named attributes from total entry
#     num_requests = getattr(total, "num_requests", None) or getattr(total, "num_reqs", None) or getattr(total, "requests", 0) or 0
#     num_failures = getattr(total, "num_failures", None) or getattr(total, "failures", None) or getattr(total, "num_failures", 0) or 0
#
#     # average response time
#     avg_ms = getattr(total, "avg_response_time", None) or getattr(total, "avg_duration", None) or getattr(total, "avg_response_time_ms", None) or 0.0
#     try:
#         avg_ms = float(avg_ms)
#     except Exception:
#         avg_ms = 0.0
#
#     # try multiple ways to get 95th percentile
#     p95_ms = None
#     for name in ("pct_95", "percentile_95", "percentile_95_response_time", "percentile_95_response_time_ms", "response_time_percentile_95"):
#         p95_ms = getattr(total, name, None)
#         if p95_ms is not None:
#             break
#     if p95_ms is None:
#         # try methods that accept a percentile
#         for method_name in ("get_response_time_percentile", "get_current_response_time_percentile", "get_request_percentile"):
#             if hasattr(total, method_name):
#                 try:
#                     p95_ms = getattr(total, method_name)(0.95)
#                     break
#                 except Exception:
#                     p95_ms = None
#     try:
#         if p95_ms is not None:
#             p95_ms = float(p95_ms)
#     except Exception:
#         p95_ms = None
#
#     return {"num_requests": int(num_requests), "num_failures": int(num_failures), "avg_ms": avg_ms, "p95_ms": p95_ms}
#
#
# # --- New: CI success evaluator, run on test stop ---
# def _ci_evaluate_and_maybe_fail(environment, **kwargs):
#     stats = _extract_total_stats(environment)
#     num_requests = stats["num_requests"]
#     num_failures = stats["num_failures"]
#     avg_ms = stats["avg_ms"]
#     p95_ms = stats["p95_ms"]
#
#     # compute failure rate
#     failure_rate = (num_failures / num_requests * 100.0) if num_requests else 0.0
#
#     # Print concise summary for CI logs
#     print("=== load test summary ===")
#     print(f"requests: {num_requests}, failures: {num_failures}, failure_rate%: {failure_rate:.2f}")
#     print(f"avg_ms: {avg_ms:.2f}, p95_ms: {p95_ms if p95_ms is not None else 'n/a'}")
#     print(f"thresholds -> failure%: {CI_MAX_FAILURE_RATE_PCT}, avg_ms: {CI_MAX_AVG_MS}, p95_ms: {CI_MAX_P95_MS}")
#     print("=========================")
#
#     # skip strict evaluation for tiny runs
#     if num_requests < CI_MIN_REQUESTS:
#         print(f"Not enforcing CI thresholds (only {num_requests} requests < CI_MIN_REQUESTS={CI_MIN_REQUESTS})")
#         environment.process_exit_code = 0
#         return
#
#     # Evaluate thresholds
#     failed = False
#     if failure_rate > CI_MAX_FAILURE_RATE_PCT:
#         print(f"FAIL: failure_rate {failure_rate:.2f}% > {CI_MAX_FAILURE_RATE_PCT}%")
#         failed = True
#     if avg_ms > CI_MAX_AVG_MS:
#         print(f"FAIL: average response time {avg_ms:.2f}ms > {CI_MAX_AVG_MS}ms")
#         failed = True
#     if p95_ms is not None and p95_ms > CI_MAX_P95_MS:
#         print(f"FAIL: p95 response time {p95_ms:.2f}ms > {CI_MAX_P95_MS}ms")
#         failed = True
#
#     # Set process exit code so headless locust returns non-zero on CI failure
#     environment.process_exit_code = (2 if failed else 0)
#
#     # Ask runner to quit (if still running) so locust exits and CI can read exit code
#     try:
#         if getattr(environment, "runner", None):
#             environment.runner.quit()
#     except Exception:
#         pass
#
#
# class OopslyUser(HttpUser):
#     # Respect human-like waits between requests
#     wait_time = between(1, 2)
#
#     # Let Locust present grouped requests by API name
#     host = ENVIRONMENTS.get("base_url", None) or None
#
#     def on_start(self):
#         # Seed runner globals used by build_api_request
#         runner.BASE_URL = ENVIRONMENTS.get("base_url", "")  # used by build_api_request
#         # Merge existing runner.CONTEXT (if any) with our seed values
#         runner.CONTEXT.update(SEED_CONTEXT)
#
#         # Register CI evaluation listener once per environment
#         # Avoid registering multiple times (multiple users) by using a flag on environment
#         if not getattr(self.environment, "_ci_listener_attached", False):
#             self.environment.events.test_stop.add_listener(_ci_evaluate_and_maybe_fail)
#             self.environment._ci_listener_attached = True
#
#     @task
#     def random_api_call(self):
#         # Pick a random API definition to exercise
#         api_name, api_info = random.choice(list(APIS.items()))
#
#         # Use runner to build request (it will substitute placeholders from runner.CONTEXT)
#         request_data = runner.build_api_request(api_info, step_vars={})
#
#         method = request_data.pop("method", "GET")
#         url = request_data.pop("url", None)  # may be absolute
#         headers = request_data.pop("headers", {})
#         params = request_data.pop("params", None)
#         json_body = request_data.pop("json", None)
#
#         # Use Locust client to send request and measure performance.
#         # Provide a meaningful 'name' so reports are grouped by API name.
#         try:
#             with self.client.request(
#                 method,
#                 url,
#                 headers=headers,
#                 params=params,
#                 json=json_body,
#                 name=api_name,
#                 catch_response=True,
#             ) as resp:
#                 # Simple success criteria for load tests: any 2xx is success.
#                 if 200 <= resp.status_code < 300:
#                     resp.success()
#                 else:
#                     resp.failure(f"Non-2xx status: {resp.status_code}")
#         except Exception as e:
#             # Let Locust record the exception as a failure
#             # (request wrapper will count it as a failed request)
#             # We can't call resp.failure here because exception prevents entering context
#             self.environment.events.request_failure.fire(
#                 request_type=method,
#                 name=api_name,
#                 response_time=0,
#                 exception=e,
#                 response=None,
#             )
