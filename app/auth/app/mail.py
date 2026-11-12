"""Hands emails to the noti Lambda, which owns templates and delivery (via Resend)."""

import json
import logging
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class EmailType(Enum):
    OTP = "otp"
    STUDY_REMINDER = "study_reminder"
    WELCOME = "welcome"
    COMMUNITY_INVITE = "community_invite"


def mask(email: str) -> str:
    """Hides most of the local part for logs."""
    at = email.find("@")
    if at < 2:
        return "***"
    return email[:1] + "***" + email[at:]


class Sender:
    """Invokes the noti Lambda once per email, naming the template to render.

    The invocation is asynchronous (`Event`): Lambda queues it and retries failures
    itself, so signing up or inviting someone never waits on (or fails because of)
    the mail provider. A disabled sender (develop mode) only logs what it skipped.
    """

    def __init__(
        self,
        function_name: str,
        region: str = "",
        client: Any = None,
        enabled: bool = True,
    ):
        if client is None and enabled:
            import boto3

            client = boto3.client("lambda", region_name=region or None)
        self._client = client
        self._function_name = function_name
        self._enabled = enabled

    def _invoke(self, template: EmailType, to: str, data: dict[str, Any]) -> None:
        if not self._enabled:
            logger.info(
                "develop mode: %s email to %s not sent. Here is the data %s",
                template.value,
                mask(to),
                json.dumps(data),
            )
            return
        self._client.invoke(
            FunctionName=self._function_name,
            InvocationType="Event",
            Payload=json.dumps(
                {"template": template.value, "to": to, "data": data}
            ).encode(),
        )

    def send_otp(self, to: str, code: str, name: str) -> None:
        self._invoke(EmailType.OTP, to, {"code": code, "name": name})

    def send_study_reminder(self, to: str, name: str, ics: str) -> None:
        self._invoke(EmailType.STUDY_REMINDER, to, {"name": name, "ics": ics})

    def send_welcome(self, to: str, name: str) -> None:
        self._invoke(EmailType.WELCOME, to, {"name": name})

    def send_community_invite(
        self, to: str, name: str, community_name: str, inviter_name: str
    ) -> None:
        self._invoke(
            EmailType.COMMUNITY_INVITE,
            to,
            {
                "name": name,
                "communityName": community_name,
                "inviterName": inviter_name,
            },
        )
