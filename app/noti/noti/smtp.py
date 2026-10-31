"""Sends a rendered message over SMTP."""

import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

from noti.templates import Message

ICS_FILENAME = "oopsly-learning.ics"
TIMEOUT_SECONDS = 15


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    # Port 465 wraps the whole connection in TLS; anything else upgrades with STARTTLS.
    implicit_tls: bool = False

    @classmethod
    def from_dict(cls, raw: dict) -> "SmtpConfig":
        missing = [k for k in ("host", "from_email") if not raw.get(k)]
        if missing:
            raise ValueError(f"SMTP settings missing: {', '.join(missing)}")
        port = int(raw.get("port") or 587)
        return cls(
            host=str(raw["host"]),
            port=port,
            username=str(raw.get("username") or ""),
            password=str(raw.get("password") or ""),
            from_email=str(raw["from_email"]),
            implicit_tls=port == 465,
        )


def build(cfg: SmtpConfig, to: str, message: Message, ics: str | None) -> EmailMessage:
    mail = EmailMessage()
    mail["From"] = cfg.from_email
    mail["To"] = to
    mail["Subject"] = message.subject
    mail.set_content(message.text)
    mail.add_alternative(message.html, subtype="html")
    if ics:
        # `method=PUBLISH` makes mail clients offer "Add to calendar".
        mail.add_attachment(
            ics.encode("utf-8"),
            maintype="text",
            subtype="calendar",
            filename=ICS_FILENAME,
            params={"method": "PUBLISH", "charset": "utf-8"},
        )
    return mail


def send(cfg: SmtpConfig, to: str, message: Message, ics: str | None = None) -> None:
    mail = build(cfg, to, message, ics)
    context = ssl.create_default_context()
    if cfg.implicit_tls:
        with smtplib.SMTP_SSL(
            cfg.host, cfg.port, timeout=TIMEOUT_SECONDS, context=context
        ) as server:
            _deliver(server, cfg, mail)
        return
    with smtplib.SMTP(cfg.host, cfg.port, timeout=TIMEOUT_SECONDS) as server:
        server.starttls(context=context)
        _deliver(server, cfg, mail)


def _deliver(server: smtplib.SMTP, cfg: SmtpConfig, mail: EmailMessage) -> None:
    if cfg.username:
        server.login(cfg.username, cfg.password)
    server.send_message(mail)
