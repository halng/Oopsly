"""Builds the recurring study reminder as an iCalendar (.ics) file."""

import re
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

TIME_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
# The web app counts days from Sunday = 0; iCalendar names them.
BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
EVENT_MINUTES = 30
ALARM_MINUTES = 10
SUMMARY = "Study on Oopsly"
DESCRIPTION = "Time for your Oopsly review. Keep your streak going!"


class InvalidReminder(ValueError):
    pass


def parse(
    days: list[int], time: str, timezone: str
) -> tuple[list[int], int, int, ZoneInfo]:
    """Validates the user's choice and returns it in a normalised form."""
    picked = sorted(set(days))
    if not picked or any(d < 0 or d > 6 for d in picked):
        raise InvalidReminder("Pick at least one day of the week")
    match = TIME_RE.match(time)
    if not match:
        raise InvalidReminder("Time must be HH:MM")
    try:
        tz = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        raise InvalidReminder("Unknown time zone") from None
    return picked, int(match.group(1)), int(match.group(2)), tz


def build_ics(
    days: list[int], time: str, timezone: str, now: datetime, uid: str | None = None
) -> str:
    picked, hour, minute, tz = parse(days, time, timezone)
    local_now = now.astimezone(tz)
    # First occurrence: the next picked day whose time has not passed yet.
    start = None
    for offset in range(8):
        day = local_now + timedelta(days=offset)
        # Python: Monday = 0; ours: Sunday = 0.
        if (day.weekday() + 1) % 7 not in picked:
            continue
        candidate = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if candidate > local_now:
            start = candidate
            break
    assert start is not None  # a picked day always recurs within a week
    end = start + timedelta(minutes=EVENT_MINUTES)
    fmt = "%Y%m%dT%H%M%S"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Oopsly//Study reminder//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid or uuid.uuid4()}@oopsly",
        f"DTSTAMP:{now.astimezone(ZoneInfo('UTC')).strftime(fmt)}Z",
        f"DTSTART;TZID={timezone}:{start.strftime(fmt)}",
        f"DTEND;TZID={timezone}:{end.strftime(fmt)}",
        f"RRULE:FREQ=WEEKLY;BYDAY={','.join(BYDAY[d] for d in picked)}",
        f"SUMMARY:{SUMMARY}",
        f"DESCRIPTION:{DESCRIPTION}",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{SUMMARY}",
        f"TRIGGER:-PT{ALARM_MINUTES}M",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"
