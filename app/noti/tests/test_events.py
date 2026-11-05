import pytest

from noti import events


def body(**over):
    base = {"template": "welcome", "to": "ann@example.com", "data": {"name": "Ann"}}
    base.update(over)
    return base


def test_parses_a_valid_event():
    e = events.parse(body())
    assert (e.type, e.to, e.name) == ("welcome", "ann@example.com", "Ann")


def test_the_name_comes_from_the_event_never_from_the_address():
    assert events.parse(body(data={"name": " Bo "})).name == "Bo"
    with pytest.raises(events.InvalidEvent):
        events.parse(body(data={}))


@pytest.mark.parametrize(
    "raw",
    [
        "not an object",
        [],
        body(template="nope"),
        body(to="not-an-email"),
        body(to="a@b.com, c@d.com"),
        body(data="x"),
        body(template="otp", data={"name": "Ann"}),
        body(template="otp", data={"code": "123456"}),
        body(template="community_invite", data={"name": "Ann"}),
        body(template="study_reminder", data={"name": "Ann"}),
        body(data={"name": "  "}),
    ],
)
def test_rejects_bad_events(raw):
    with pytest.raises(events.InvalidEvent):
        events.parse(raw)


def test_mask_hides_the_local_part():
    assert events.mask("ann@example.com") == "a***@example.com"
    assert events.mask("a@b.com") == "***"
