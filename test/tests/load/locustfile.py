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
#     or other liability, whether in action of contract, tort, or otherwise,
#     arising from, out of or in connection with the Software.

"""
Load tests for Oopsly API endpoints using Locust.
Uses api.yaml for endpoint definitions and tests common read operations.
Run: locust -f tests/load/locustfile.py --host=http://localhost:9009/api/v1/oopsly
"""

import os
import random
import re
import time
from locust import HttpUser, task, between

import tests.utils.utils as utils

# Load API definitions at import time
ENVIRONMENTS, APIS = utils.get_api_definitions()
BASE_URL = ENVIRONMENTS.get("base_url", "http://localhost:9009/api/v1/oopsly")

# APIs that are safe for load testing (read-only or idempotent, no auth required for some)
# OTP and token endpoints need real credentials; we focus on endpoints that can be hit with fake tokens
LOAD_TEST_APIS = [
    "GENERATE_OTP",  # Can use random email
    "TOKEN_VALIDATE",  # Will 401 but we measure latency
]

# APIs that need auth - we use placeholder tokens (will fail but measure)
AUTH_APIS = [
    "SHELF_GET_ALL",
    "SHELF_GET_BY_ID",
    "SUBJECT_GET_ALL_BY_SHELF",
    "USERPROFILE_GET",
]

_VAR_PATTERN = re.compile(r"\$\{?(\w+)\}?")


def _make_seed_context():
    """Create sensible default values for placeholders."""
    rand = random.randint(1000, 9999)
    return {
        "EMAIL": f"loadtest+{int(time.time()) % 10000}+{rand}@oopsly.com",
        "OTP_CODE": "000000",
        "AUTH_TOKEN": f"fake-token-{rand}",
        "REFRESH_TOKEN": f"fake-refresh-{rand}",
        "SHELF_ID": "00000000-0000-0000-0000-000000000000",
        "SUBJECT_ID": "00000000-0000-0000-0000-000000000000",
        "PAGE_NUM": "0",
        "PAGE_SIZE": "10",
    }


def _build_request(api_name: str):
    """Build request for an API using utils."""
    api_info = APIS.get(api_name)
    if not api_info:
        return None
    ctx = _make_seed_context()
    utils.CONTEXT.update(ctx)
    return utils.build_api_request(api_info, ctx)


class OopslyApiUser(HttpUser):
    """Simulates users hitting Oopsly API endpoints."""

    wait_time = between(1, 3)
    host = BASE_URL

    def on_start(self):
        """Seed context for request building."""
        utils.BASE_URL = BASE_URL
        utils.CONTEXT.update(_make_seed_context())

    @task(3)
    def generate_otp(self):
        """Generate OTP - uses random email, measures latency."""
        req = _build_request("GENERATE_OTP")
        if not req:
            return
        self._execute_request(req, "GENERATE_OTP")

    @task(2)
    def get_shelves(self):
        """Get all shelves - requires auth, will 401 but we measure."""
        req = _build_request("SHELF_GET_ALL")
        if not req:
            return
        req["params"] = req.get("params", {})
        req["params"]["page"] = "0"
        req["params"]["size"] = "10"
        self._execute_request(req, "SHELF_GET_ALL")

    @task(1)
    def get_profile(self):
        """Get user profile - requires auth."""
        req = _build_request("USERPROFILE_GET")
        if not req:
            return
        self._execute_request(req, "USERPROFILE_GET")

    def _execute_request(self, req: dict, name: str):
        """Execute HTTP request and record in Locust."""
        method = req.pop("method", "GET").upper()
        url = req.pop("url", "")
        headers = req.pop("headers", {})
        params = req.pop("params", {})
        json_body = req.pop("json", None)

        # Extract path from full URL (Locust host is already set)
        from urllib.parse import urlparse
        if url.startswith("http"):
            parsed = urlparse(url)
            path = parsed.path or "/"
        else:
            path = url if url.startswith("/") else "/" + url

        try:
            with self.client.request(
                method,
                path,
                headers=headers,
                params=params if params else None,
                json=json_body,
                name=name,
                catch_response=True,
            ) as resp:
                if 200 <= resp.status_code < 300:
                    resp.success()
                elif resp.status_code == 401:
                    # Expected for auth endpoints with fake token
                    resp.success()
                else:
                    resp.failure(f"Status {resp.status_code}")
        except Exception as e:
            self.environment.events.request_failure.fire(
                request_type=method,
                name=name,
                response_time=0,
                exception=e,
                response=None,
            )
