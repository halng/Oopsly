"""AWS Lambda entry point: one invocation in, one email out.

Other services invoke this function directly with
`{"template": "otp", "to": "a@b.co", "data": {...}}`. They invoke it asynchronously,
so a failure here (Resend down) is retried by Lambda itself, not by the caller.
"""

import json
import logging
import os
from collections.abc import Callable
from functools import lru_cache

from noti import events, resend, templates

logger = logging.getLogger()
logger.setLevel(logging.INFO)


@lru_cache(maxsize=1)
def resend_config() -> resend.ResendConfig:
    """Reads the Resend settings from Secrets Manager once per warm container."""
    import boto3  # provided by the Lambda runtime

    secret = boto3.client("secretsmanager").get_secret_value(
        SecretId=os.environ["RESEND_SECRET_ARN"]
    )
    return resend.ResendConfig.from_dict(json.loads(secret["SecretString"]))


def process(
    event: events.Event,
    cfg: resend.ResendConfig,
    send: Callable[..., None] = resend.send,
    app_url: str = templates.APP_URL_DEFAULT,
) -> None:
    message = templates.render(event, app_url)
    ics = event.data["ics"] if event.type == events.STUDY_REMINDER else None
    send(cfg, event.to, message, ics)


def handler(payload: dict, context=None, send: Callable[..., None] = resend.send):
    """Raises when delivery fails so Lambda retries an asynchronous invocation."""
    app_url = os.environ.get("APP_URL") or templates.APP_URL_DEFAULT
    try:
        event = events.parse(payload)
    except events.InvalidEvent as e:
        # Retrying cannot fix a malformed request; log it and drop it.
        logger.error("dropping request: %s", e)
        return {"status": "dropped", "reason": str(e)}

    try:
        process(event, resend_config(), send, app_url)
    except Exception:
        logger.exception(
            "failed to send %s email to %s", event.type, events.mask(event.to)
        )
        raise
    logger.info("sent %s email to %s", event.type, events.mask(event.to))
    return {"status": "sent"}
