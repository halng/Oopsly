"""Thin wrapper that names every request after its endpoint template.

Locust groups statistics by request name. Using the path template (not the concrete URL)
gives one row per endpoint, which is what the thresholds are written against.
"""

from __future__ import annotations

from typing import Any, Iterable


class Api:
    def __init__(self, client):
        self.client = client

    def call(
        self,
        method: str,
        template: str,
        *,
        path: dict[str, Any] | None = None,
        expect: Iterable[int] = (200,),
        token: str | None = None,
        **kwargs,
    ) -> Any:
        """Sends one request and returns `data` from the response, or None on failure.

        A response counts as a success only when its status is in `expect` and, for JSON bodies
        that carry the API envelope, `isSuccess` is true.
        """
        expected = tuple(expect)
        url = template.format(**path) if path else template
        headers = {"Authorization": f"Bearer {token}"} if token else None
        with self.client.request(
            method,
            url,
            name=template,
            headers=headers,
            catch_response=True,
            **kwargs,
        ) as response:
            if response.status_code not in expected:
                response.failure(f"HTTP {response.status_code}, expected {expected}")
                return None
            try:
                body = response.json()
            except ValueError:
                response.success()
                return None
            if isinstance(body, dict) and body.get("isSuccess") is False and response.status_code < 400:
                response.failure(f"isSuccess=false: {body.get('message')}")
                return None
            response.success()
            return body.get("data") if isinstance(body, dict) else body
