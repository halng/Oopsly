"""The messages other services put on the queue."""

import json
import re
from dataclasses import dataclass, field
from typing import Any

OTP = "otp"
WELCOME = "welcome"
COMMUNITY_INVITE = "community_invite"
STUDY_REMINDER = "study_reminder"

# What each event type must carry in `data`.
REQUIRED: dict[str, tuple[str, ...]] = {
    OTP: ("code",),
    WELCOME: (),
    COMMUNITY_INVITE: ("communityName",),
    STUDY_REMINDER: ("ics",),
}

EMAIL_RE = re.compile(r"^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$")


class InvalidEvent(ValueError):
    """The message can never succeed, so it is not worth retrying."""


@dataclass(frozen=True)
class Event:
    type: str
    to: str
    data: dict[str, Any] = field(default_factory=dict)

    @property
    def name(self) -> str:
        """Who to greet: the given name, else the part before the @."""
        given = str(self.data.get("name") or "").strip()
        return given or self.to.split("@", 1)[0]


def parse(body: str) -> Event:
    try:
        raw = json.loads(body)
    except (TypeError, ValueError):
        raise InvalidEvent("body is not JSON") from None
    if not isinstance(raw, dict):
        raise InvalidEvent("body must be a JSON object")

    kind = raw.get("type")
    if kind not in REQUIRED:
        raise InvalidEvent(f"unknown event type: {kind!r}")
    to = str(raw.get("to") or "").strip()
    if not EMAIL_RE.match(to):
        raise InvalidEvent("`to` must be one email address")
    data = raw.get("data") or {}
    if not isinstance(data, dict):
        raise InvalidEvent("`data` must be an object")
    for key in REQUIRED[kind]:
        if not str(data.get(key) or "").strip():
            raise InvalidEvent(f"{kind} needs data.{key}")
    return Event(type=kind, to=to, data=data)


def mask(email: str) -> str:
    """Hides most of the local part for logs."""
    at = email.find("@")
    if at < 2:
        return "***"
    return email[:1] + "***" + email[at:]
