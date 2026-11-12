"""The requests other services send straight to the noti Lambda."""

import re
from dataclasses import dataclass, field
from typing import Any

OTP = "otp"
WELCOME = "welcome"
COMMUNITY_INVITE = "community_invite"
STUDY_REMINDER = "study_reminder"

# What each event type must carry in `data`.
REQUIRED: dict[str, tuple[str, ...]] = {
    OTP: ("name", "code"),
    WELCOME: ("name",),
    COMMUNITY_INVITE: ("name", "communityName"),
    STUDY_REMINDER: ("name", "ics"),
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
        """Who to greet: the name the sender put in the event."""
        return str(self.data.get("name") or "").strip()


def parse(raw: Any) -> Event:
    """Reads `{"template": ..., "to": ..., "data": {...}}` as the Lambda receives it."""
    if not isinstance(raw, dict):
        raise InvalidEvent("payload must be a JSON object")

    kind = raw.get("template")
    if kind not in REQUIRED:
        raise InvalidEvent(f"unknown template: {kind!r}")
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
