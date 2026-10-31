"""AWS Lambda entry point: one SQS batch in, one email per message out."""

import json
import logging
import os
from collections.abc import Callable
from functools import lru_cache

from noti import events, smtp, templates

logger = logging.getLogger()
logger.setLevel(logging.INFO)


@lru_cache(maxsize=1)
def smtp_config() -> smtp.SmtpConfig:
    """Reads the SMTP settings from Secrets Manager once per warm container."""
    import boto3  # provided by the Lambda runtime

    secret = boto3.client("secretsmanager").get_secret_value(
        SecretId=os.environ["SMTP_SECRET_ARN"]
    )
    return smtp.SmtpConfig.from_dict(json.loads(secret["SecretString"]))


def process(
    event: events.Event,
    cfg: smtp.SmtpConfig,
    send: Callable[..., None] = smtp.send,
    app_url: str = templates.APP_URL_DEFAULT,
) -> None:
    message = templates.render(event, app_url)
    ics = event.data["ics"] if event.type == events.STUDY_REMINDER else None
    send(cfg, event.to, message, ics)


def handler(sqs_event: dict, context=None, send: Callable[..., None] = smtp.send):
    """Failed messages go back to the queue (and later the dead-letter queue);
    the rest of the batch is still acknowledged."""
    failures: list[dict[str, str]] = []
    app_url = os.environ.get("APP_URL") or templates.APP_URL_DEFAULT

    for record in sqs_event.get("Records", []):
        message_id = record.get("messageId", "")
        try:
            event = events.parse(record.get("body", ""))
        except events.InvalidEvent as e:
            # Retrying cannot fix a malformed message; log it and drop it.
            logger.error("dropping message %s: %s", message_id, e)
            continue
        try:
            process(event, smtp_config(), send, app_url)
            logger.info("sent %s email to %s", event.type, events.mask(event.to))
        except Exception:
            logger.exception(
                "failed to send %s email to %s", event.type, events.mask(event.to)
            )
            failures.append({"itemIdentifier": message_id})

    return {"batchItemFailures": failures}
