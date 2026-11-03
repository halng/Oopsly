"""Turns an event into a subject plus HTML and plain-text bodies.

The HTML lives in noti/resource/<event type>.html. Its {{PLACEHOLDER}} tokens are
replaced with HTML-escaped values here, so user input never reaches the markup raw.
"""

import html
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from noti import events
from noti.events import Event

APP_URL_DEFAULT = "https://quizi.tech"
OTP_MINUTES = 5
ALARM_MINUTES = 10
CALENDAR_EVENT = "Learning on Quizi"
RESOURCE_DIR = Path(__file__).with_name("resource")


@dataclass(frozen=True)
class Message:
    subject: str
    html: str
    text: str


def _one_line(value: str) -> str:
    """A name or title for a subject line: one line, no stray whitespace."""
    return " ".join(value.split())


@cache
def _load(kind: str) -> str:
    return (RESOURCE_DIR / f"{kind}.html").read_text(encoding="utf-8")


def fill(kind: str, values: dict[str, object]) -> str:
    """Fills noti/resource/<kind>.html; every value is escaped, for attributes too."""
    page = _load(kind)
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", html.escape(str(value), quote=True))
    return page


def render(event: Event, app_url: str = APP_URL_DEFAULT) -> Message:
    app_url = app_url.rstrip("/")
    name = event.name

    if event.type == events.OTP:
        code = str(event.data["code"]).strip()
        return Message(
            subject=f"{code} is your Quizi verification code",
            html=fill(events.OTP, {"NAME": name, "CODE": code, "MINUTES": OTP_MINUTES}),
            text=(
                f"Hello {name},\n\nYour Quizi verification code is {code}. "
                f"It works for the next {OTP_MINUTES} minutes.\n\n"
                "If you did not request it, you can ignore this email.\n"
            ),
        )

    if event.type == events.WELCOME:
        return Message(
            subject=f"Welcome to Quizi, {_one_line(name)}! \U0001f331",
            html=fill(events.WELCOME, {"NAME": name, "APP_URL": app_url}),
            text=(
                f"Hi {name}, welcome to Quizi!\n\n"
                "Study smart, remember forever: build decks, review them with "
                f"spaced repetition and keep your streak going.\n\n{app_url}\n"
            ),
        )

    if event.type == events.COMMUNITY_INVITE:
        community = str(event.data["communityName"]).strip()
        inviter = str(event.data.get("inviterName") or "").strip()
        who = f"{inviter} invited you" if inviter else "You have been invited"
        return Message(
            subject=(
                f"{_one_line(inviter)} invited you to join {_one_line(community)} on Quizi"
                if inviter
                else f"You are invited to join {_one_line(community)} on Quizi"
            ),
            html=fill(
                events.COMMUNITY_INVITE,
                {
                    "NAME": name,
                    "INVITE_LINE": who,
                    "COMMUNITY_NAME": community,
                    "COMMUNITY_URL": f"{app_url}/leaderboard",
                },
            ),
            text=(
                f"Hi {name},\n\n{who} to join the {community} community on "
                f"Quizi.\n\n{app_url}/leaderboard\n"
            ),
        )

    return Message(
        subject="Your study schedule is ready: add it to your calendar",
        html=fill(
            events.STUDY_REMINDER,
            {
                "NAME": name,
                "CALENDAR_EVENT": CALENDAR_EVENT,
                "ALARM_MINUTES": ALARM_MINUTES,
            },
        ),
        text=(
            f"Hi {name},\n\nOpen the attached calendar file to add "
            f"'{CALENDAR_EVENT}' to your calendar. It repeats on the days you "
            f"picked, with a reminder {ALARM_MINUTES} minutes before.\n"
        ),
    )
