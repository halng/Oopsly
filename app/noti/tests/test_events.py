import json

import pytest

from noti import events


def body(**over):
    base = {"type": "welcome", "to": "ann@example.com", "data": {"name": "Ann"}}
    base.update(over)
    return json.dumps(base)


def test_parses_a_valid_event():
    e = events.parse(body())
    assert (e.type, e.to, e.name) == ("welcome", "ann@example.com", "Ann")


def test_name_falls_back_to_the_local_part():
    assert events.parse(body(data={})).name == "ann"


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        "[]",
        body(type="nope"),
        body(to="not-an-email"),
        body(to="a@b.com, c@d.com"),
        body(data="x"),
        body(type="otp", data={}),
        body(type="community_invite", data={"name": "Ann"}),
        body(type="study_reminder", data={}),
    ],
)
def test_rejects_bad_events(raw):
    with pytest.raises(events.InvalidEvent):
        events.parse(raw)


def test_mask_hides_the_local_part():
    assert events.mask("ann@example.com") == "a***@example.com"
    assert events.mask("a@b.com") == "***"
