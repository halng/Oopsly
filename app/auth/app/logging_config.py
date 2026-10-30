"""Console logs in the same shape as the API logback pattern."""

import hashlib
import logging
import re
import sys
from collections.abc import Mapping
from contextvars import ContextVar
from datetime import datetime

request_platform: ContextVar[str] = ContextVar("xp", default="")
request_id: ContextVar[str] = ContextVar("xid", default="")

_RESET = "\033[0m"
_BLUE = "\033[34m"
_YELLOW = "\033[33m"
_GREEN = "\033[32m"
_BOLD_RED = "\033[1;31m"

_LEVEL_COLOR = {
    logging.DEBUG: _BLUE,
    logging.INFO: _BLUE,
    logging.WARNING: _YELLOW,
    logging.ERROR: _BOLD_RED,
    logging.CRITICAL: _BOLD_RED,
}


_SECRET_HEADER = re.compile(r"authorization|cookie|token|secret|password|api-key", re.I)
_FINGERPRINTED_HEADERS = {"x-internal-key"}


def _fingerprint(value: str) -> str:
    """Length plus a short hash: enough to compare two keys, not to recover one."""
    digest = hashlib.sha256(value.encode()).hexdigest()[:8]
    return f"<len={len(value)} sha256={digest}>"


def mask_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Request headers that are safe to log.

    Credentials (Authorization/access tokens, cookies, anything token-like) are
    never written; the internal service key is reduced to a fingerprint so a
    mismatch between two services can still be spotted.
    """
    safe: dict[str, str] = {}
    for name, value in headers.items():
        key = name.lower()
        if key in _FINGERPRINTED_HEADERS:
            safe[key] = _fingerprint(value)
        elif _SECRET_HEADER.search(key):
            safe[key] = "***"
        else:
            safe[key] = value[:200]
    return safe


class OopslyFormatter(logging.Formatter):
    """Mirror the Java logback pattern.

    %d{ISO8601} %highlight(%-5level) [%blue(%t)] %yellow([%X{XP}:%X{XID}])
    %green(%logger{36}) - %msg
    """

    def format(self, record: logging.LogRecord) -> str:
        stamp = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S,%f")[
            :-3
        ]
        level = f"{record.levelname:<5}"
        level_color = _LEVEL_COLOR.get(record.levelno, _RESET)
        thread = record.threadName
        context = f"[{request_platform.get()}:{request_id.get()}]"
        logger_name = record.name[-36:]
        message = record.getMessage()
        line = (
            f"{stamp} {level_color}{level}{_RESET} "
            f"[{_BLUE}{thread}{_RESET}] "
            f"{_YELLOW}{context}{_RESET} "
            f"{_GREEN}{logger_name}{_RESET} - {message}"
        )
        if record.exc_info:
            line = f"{line}\n{self.formatException(record.exc_info)}"
        return line


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(OopslyFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
    for name in ("uvicorn", "uvicorn.error", "app"):
        logger = logging.getLogger(name)
        logger.handlers = [handler]
        logger.propagate = False
        logger.setLevel(logging.INFO)
    logging.getLogger("app").setLevel(logging.DEBUG)
    # Every request is logged once by the middleware, with its id and duration.
    logging.getLogger("uvicorn.access").disabled = True
