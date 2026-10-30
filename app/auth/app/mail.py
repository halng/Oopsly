"""Sends OTP emails."""

import html
import logging
from pathlib import Path
from typing import Protocol

logger = logging.getLogger(__name__)

OTP_SUBJECT = "Oops! You got it! Here is your code"
_TEMPLATE = Path(__file__).with_name("email-otp.html")


class Sender(Protocol):
    def send_otp(self, to: str, code: str) -> None: ...

    def send_study_reminder(self, to: str, ics: str) -> None: ...


def mask(email: str) -> str:
    """Hides most of the local part for logs."""
    at = email.find("@")
    if at < 2:
        return "***"
    return email[:1] + "***" + email[at:]


def render_otp(to: str, code: str) -> str:
    user = html.escape(to.split("@", 1)[0])
    return (
        _TEMPLATE.read_text(encoding="utf-8")
        .replace("{{OTP_CODE}}", html.escape(code))
        .replace("{{USER_NAME}}", user)
    )


class NoOpSender:
    """Logs instead of sending. Email delivery (Resend) is not wired up yet."""

    def send_otp(self, to: str, code: str) -> None:
        logger.info("mail disabled; skipping OTP email to %s", mask(to))

    def send_study_reminder(self, to: str, ics: str) -> None:
        logger.info(
            "mail disabled; skipping study reminder to %s (%d byte calendar)",
            mask(to),
            len(ics),
        )
