from noti import events, templates
from noti.events import Event


def render(kind, data=None, to="ann@example.com"):
    return templates.render(Event(kind, to, data or {}), "https://app.test/")


def test_otp_carries_the_code():
    m = render(events.OTP, {"code": "123456", "name": "Ann"})
    assert "123456" in m.html and "123456" in m.text
    assert "5 minutes" in m.text


def test_welcome_links_to_the_app():
    m = render(events.WELCOME, {"name": "Ann"})
    assert "Welcome" in m.subject
    assert 'href="https://app.test"' in m.html


def test_invite_names_the_community_and_inviter():
    m = render(
        events.COMMUNITY_INVITE, {"communityName": "Math Club", "inviterName": "Bo"}
    )
    assert "Math Club" in m.subject
    assert "Bo invited you" in m.text


def test_invite_without_inviter():
    m = render(events.COMMUNITY_INVITE, {"communityName": "Math Club"})
    assert "You have been invited" in m.text


def test_study_reminder_is_named_learning_on_oopsly():
    m = render(events.STUDY_REMINDER, {"ics": "BEGIN:VCALENDAR"})
    assert "Learning on Oopsly" in m.subject


def test_user_input_is_escaped():
    m = render(
        events.COMMUNITY_INVITE,
        {"communityName": "<script>x</script>", "name": "<b>Ann</b>"},
    )
    assert "<script>" not in m.html
    assert "<b>Ann</b>" not in m.html


def test_otp_has_the_ignore_notice():
    m = render(events.OTP, {"code": "123456"})
    assert "safely ignore" in m.html


def test_every_event_has_a_template_and_no_placeholder_is_left():
    samples = {
        events.OTP: {"code": "123456"},
        events.WELCOME: {},
        events.COMMUNITY_INVITE: {"communityName": "Math Club"},
        events.STUDY_REMINDER: {"ics": "ICS"},
    }
    assert set(samples) == set(events.REQUIRED)
    for kind, data in samples.items():
        assert (templates.RESOURCE_DIR / f"{kind}.html").is_file()
        assert "{{" not in render(kind, data).html


def test_attribute_values_are_escaped():
    m = templates.render(
        Event(events.WELCOME, "a@b.co", {}), 'https://x.test/"onclick="evil'
    )
    assert 'onclick="evil' not in m.html
