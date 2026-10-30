from datetime import UTC, datetime

import pytest

from app import reminder
from tests.conftest import bearer, login

BASE = "/api/auth"
# A Wednesday, 10:00 in Singapore (UTC+8).
NOW = datetime(2026, 11, 4, 2, 0, tzinfo=UTC)


def _ics(days, time="18:00", tz="Asia/Singapore"):
    return reminder.build_ics(days, time, tz, NOW, uid="fixed")


def test_ics_repeats_weekly_on_the_chosen_days():
    ics = _ics([1, 3, 5])
    assert "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR" in ics
    assert "DTSTART;TZID=Asia/Singapore:20261104T180000" in ics
    assert "DTEND;TZID=Asia/Singapore:20261104T183000" in ics
    assert "UID:fixed@oopsly" in ics
    assert "TRIGGER:-PT10M" in ics
    assert ics.startswith("BEGIN:VCALENDAR\r\n") and ics.endswith("END:VCALENDAR\r\n")


def test_first_occurrence_skips_a_time_that_has_passed_today():
    # Wednesday 06:00 has passed (it is 10:00 locally), so the next Wednesday.
    assert "DTSTART;TZID=Asia/Singapore:20261111T060000" in _ics([3], "06:00")


def test_first_occurrence_uses_the_next_picked_day():
    # Only Sunday: Wednesday 4th -> Sunday 8th.
    assert "DTSTART;TZID=Asia/Singapore:20261108T180000" in _ics([0])


@pytest.mark.parametrize(
    ("days", "time", "tz"),
    [
        ([], "18:00", "UTC"),
        ([7], "18:00", "UTC"),
        ([-1], "18:00", "UTC"),
        ([1], "25:00", "UTC"),
        ([1], "6pm", "UTC"),
        ([1], "18:00", "Mars/Olympus"),
        ([1], "18:00", ""),
    ],
)
def test_invalid_choices_are_rejected(days, time, tz):
    with pytest.raises(reminder.InvalidReminder):
        reminder.build_ics(days, time, tz, NOW)


def test_endpoint_emails_the_calendar_to_the_user(client, outbox):
    tokens = login(client)
    res = client.post(
        f"{BASE}/v1/user-profiles/study-reminder",
        json={"days": [1, 2], "time": "07:30", "timezone": "Asia/Singapore"},
        headers=bearer(tokens),
    )
    assert res.status_code == 200
    ((to, ics),) = outbox.reminders
    assert "@" in to
    assert "BYDAY=MO,TU" in ics


def test_endpoint_rejects_bad_input_and_anonymous_calls(client, outbox):
    tokens = login(client)
    url = f"{BASE}/v1/user-profiles/study-reminder"
    bad = client.post(
        url,
        json={"days": [], "time": "07:30", "timezone": "UTC"},
        headers=bearer(tokens),
    )
    assert bad.status_code == 400
    assert client.post(url, json={}).status_code in (401, 403)
    assert outbox.reminders == []


def test_calendar_endpoint_returns_the_file_without_emailing(client, outbox):
    tokens = login(client)
    url = f"{BASE}/v1/user-profiles/study-reminder/calendar"
    res = client.post(
        url,
        json={"days": [1], "time": "07:30", "timezone": "UTC"},
        headers=bearer(tokens),
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["filename"].endswith(".ics")
    assert "BYDAY=MO" in data["ics"]
    assert outbox.reminders == []
    bad = client.post(
        url,
        json={"days": [], "time": "07:30", "timezone": "UTC"},
        headers=bearer(tokens),
    )
    assert bad.status_code == 400
    assert client.post(url, json={}).status_code in (401, 403)
