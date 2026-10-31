import pytest

from noti import smtp
from noti.templates import Message

CFG = smtp.SmtpConfig("smtp.test", 587, "u", "p", "Oopsly <no-reply@oopsly.test>")
MSG = Message("Hi", "<p>Hi</p>", "Hi")


def test_builds_a_multipart_message_without_attachment():
    mail = smtp.build(CFG, "ann@example.com", MSG, None)
    assert mail["To"] == "ann@example.com"
    assert mail["Subject"] == "Hi"
    assert not list(mail.iter_attachments())


def test_attaches_the_calendar_file():
    mail = smtp.build(CFG, "ann@example.com", MSG, "BEGIN:VCALENDAR\r\n")
    (attachment,) = mail.iter_attachments()
    assert attachment.get_content_type() == "text/calendar"
    assert attachment.get_filename() == smtp.ICS_FILENAME
    assert attachment.get_param("method") == "PUBLISH"


def test_config_defaults_and_validation():
    cfg = smtp.SmtpConfig.from_dict({"host": "h", "from_email": "a@b.c", "port": 465})
    assert cfg.implicit_tls and cfg.port == 465
    assert smtp.SmtpConfig.from_dict({"host": "h", "from_email": "a@b.c"}).port == 587
    with pytest.raises(ValueError):
        smtp.SmtpConfig.from_dict({"host": "h"})


class FakeServer:
    instances: list = []

    def __init__(self, *a, **kw):
        self.args, self.sent, self.logged_in, self.tls = a, [], None, False
        FakeServer.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self, context=None):
        self.tls = True

    def login(self, user, password):
        self.logged_in = (user, password)

    def send_message(self, mail):
        self.sent.append(mail)


@pytest.mark.parametrize("port,tls_class", [(587, "SMTP"), (465, "SMTP_SSL")])
def test_send_uses_starttls_or_implicit_tls(monkeypatch, port, tls_class):
    FakeServer.instances = []
    monkeypatch.setattr(smtp.smtplib, tls_class, FakeServer)
    cfg = smtp.SmtpConfig.from_dict(
        {
            "host": "h",
            "port": port,
            "username": "u",
            "password": "p",
            "from_email": "x@y.z",
        }
    )
    smtp.send(cfg, "ann@example.com", MSG)
    (server,) = FakeServer.instances
    assert server.logged_in == ("u", "p")
    assert len(server.sent) == 1
    assert server.tls is (port == 587)
