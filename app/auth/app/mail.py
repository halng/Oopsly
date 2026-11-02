"""Hands emails to the noti Lambda, which owns templates and delivery (via Resend)."""

import html
import json
import logging
from pathlib import Path
from typing import Any, Protocol

logger = logging.getLogger(__name__)

OTP_SUBJECT = "Oops! You got it! Here is your code"
_TEMPLATE = Path(__file__).with_name("email-otp.html")


class Sender(Protocol):
    def send_otp(self, to: str, code: str) -> None: ...

    def send_study_reminder(self, to: str, ics: str) -> None: ...

    def send_welcome(self, to: str, name: str) -> None: ...

    def send_community_invite(
        self, to: str, name: str, community_name: str, inviter_name: str
    ) -> None: ...


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
    """Logs instead of sending; used when no noti function is configured."""

    def send_otp(self, to: str, code: str) -> None:
        logger.info("mail disabled; skipping OTP email to %s", mask(to))

    def send_study_reminder(self, to: str, ics: str) -> None:
        logger.info(
            "mail disabled; skipping study reminder to %s (%d byte calendar)",
            mask(to),
            len(ics),
        )

    def send_welcome(self, to: str, name: str) -> None:
        logger.info("mail disabled; skipping welcome email to %s", mask(to))

    def send_community_invite(
        self, to: str, name: str, community_name: str, inviter_name: str
    ) -> None:
        logger.info("mail disabled; skipping community invite to %s", mask(to))


class LambdaSender:
    """Invokes the noti Lambda once per email, naming the template to render.

    The invocation is asynchronous (`Event`): Lambda queues it and retries failures
    itself, so signing up or inviting someone never waits on (or fails because of)
    the mail provider.
    """

    def __init__(self, function_name: str, region: str = "", client: Any = None):
        if client is None:
            import boto3

            client = boto3.client("lambda", region_name=region or None)
        self._client = client
        self._function_name = function_name

    def _invoke(self, template: str, to: str, data: dict[str, Any]) -> None:
        self._client.invoke(
            FunctionName=self._function_name,
            InvocationType="Event",
            Payload=json.dumps({"template": template, "to": to, "data": data}).encode(),
        )

    def send_otp(self, to: str, code: str) -> None:
        self._invoke("otp", to, {"code": code})

    def send_study_reminder(self, to: str, ics: str) -> None:
        self._invoke("study_reminder", to, {"ics": ics})

    def send_welcome(self, to: str, name: str) -> None:
        self._invoke("welcome", to, {"name": name})

    def send_community_invite(
        self, to: str, name: str, community_name: str, inviter_name: str
    ) -> None:
        self._invoke(
            "community_invite",
            to,
            {
                "name": name,
                "communityName": community_name,
                "inviterName": inviter_name,
            },
        )
