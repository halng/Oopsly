"""The small key-value surface the service needs from Redis."""

import time
from typing import Protocol

import redis


class KV(Protocol):
    def get(self, key: str) -> str | None: ...

    def set(self, key: str, value: str, ttl_seconds: float | None = None) -> None: ...

    def delete(self, *keys: str) -> None: ...


class RedisKV:
    def __init__(self, client: redis.Redis):
        self._client = client

    def get(self, key: str) -> str | None:
        return self._client.get(key)

    def set(self, key: str, value: str, ttl_seconds: float | None = None) -> None:
        px = int(ttl_seconds * 1000) if ttl_seconds else None
        self._client.set(key, value, px=px)

    def delete(self, *keys: str) -> None:
        if keys:
            self._client.delete(*keys)


class MemoryKV:
    """In-process KV for tests."""

    def __init__(self, clock=time.monotonic):
        self._clock = clock
        self._data: dict[str, tuple[str, float | None]] = {}

    def get(self, key: str) -> str | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        value, expires = entry
        if expires is not None and expires <= self._clock():
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: str, ttl_seconds: float | None = None) -> None:
        expires = self._clock() + ttl_seconds if ttl_seconds else None
        self._data[key] = (value, expires)

    def delete(self, *keys: str) -> None:
        for key in keys:
            self._data.pop(key, None)
