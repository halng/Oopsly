import threading
import time
from collections.abc import Callable

import httpx
import jwt
from jwt.algorithms import RSAAlgorithm


def fetch_jwks(url: str, timeout: float) -> dict:
    response = httpx.get(url, timeout=timeout)
    response.raise_for_status()
    return response.json()


class JwksCache:
    """In-memory public key cache filled from the auth service JWKS endpoint.

    The first lookup loads the set. An unknown kid triggers a refetch, at most
    once per min_refetch_seconds, so a rotated key is picked up without letting
    random kids hammer the auth service. A failed fetch keeps the old keys.
    """

    def __init__(
        self,
        url: str,
        min_refetch_seconds: float = 30,
        timeout: float = 5,
        fetch: Callable[[str, float], dict] = fetch_jwks,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.url = url
        self.min_refetch_seconds = min_refetch_seconds
        self.timeout = timeout
        self._fetch = fetch
        self._clock = clock
        self._lock = threading.Lock()
        self._keys: dict[str, object] = {}
        self._last_fetch: float | None = None

    def get_key(self, kid: str | None):
        if not kid:
            raise jwt.InvalidTokenError("missing kid")
        key = self._keys.get(kid)
        if key is not None:
            return key
        with self._lock:
            key = self._keys.get(kid)
            if key is None and self._may_fetch():
                self._refresh()
                key = self._keys.get(kid)
        if key is None:
            raise jwt.InvalidTokenError("unknown kid")
        return key

    def _may_fetch(self) -> bool:
        return (
            self._last_fetch is None
            or self._clock() - self._last_fetch >= self.min_refetch_seconds
        )

    def _refresh(self) -> None:
        self._last_fetch = self._clock()
        try:
            document = self._fetch(self.url, self.timeout)
            keys = {
                entry["kid"]: RSAAlgorithm.from_jwk(entry)
                for entry in document["keys"]
                if entry.get("kty") == "RSA" and entry.get("kid")
            }
        except Exception:  # noqa: BLE001 - keep serving the cached keys
            return
        self._keys = keys
