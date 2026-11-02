"""Sends a rendered message through the Resend HTTP API."""

import base64
import json
import urllib.error
import urllib.request
from dataclasses import dataclass

from noti.templates import Message

API_URL = "https://api.resend.com/emails"
ICS_FILENAME = "quizi-learning.ics"
TIMEOUT_SECONDS = 15


class ResendError(RuntimeError):
    """Resend refused or could not be reached; the caller may retry."""


@dataclass(frozen=True)
class ResendConfig:
    api_key: str
    from_email: str

    @classmethod
    def from_dict(cls, raw: dict) -> "ResendConfig":
        missing = [k for k in ("api_key", "from_email") if not raw.get(k)]
        if missing:
            raise ValueError(f"Resend settings missing: {', '.join(missing)}")
        return cls(api_key=str(raw["api_key"]), from_email=str(raw["from_email"]))


def build(cfg: ResendConfig, to: str, message: Message, ics: str | None) -> dict:
    payload: dict = {
        "from": cfg.from_email,
        "to": [to],
        "subject": message.subject,
        "html": message.html,
        "text": message.text,
    }
    if ics:
        payload["attachments"] = [
            {
                "filename": ICS_FILENAME,
                "content": base64.b64encode(ics.encode("utf-8")).decode("ascii"),
                "content_type": "text/calendar; method=PUBLISH; charset=utf-8",
            }
        ]
    return payload


def send(cfg: ResendConfig, to: str, message: Message, ics: str | None = None) -> None:
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(build(cfg, to, message, ics)).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json",
            # Resend sits behind Cloudflare, which rejects urllib's default agent.
            "User-Agent": "quizi-noti/0.1",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS):
            return
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise ResendError(f"Resend answered {e.code}: {detail}") from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise ResendError(f"Resend unreachable: {e}") from e
