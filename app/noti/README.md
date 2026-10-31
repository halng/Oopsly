# noti

AWS Lambda that sends Oopsly's emails. Other services never talk to the mail server: they put
a JSON event on an SQS queue and this function turns it into an email over SMTP, so signing
up or inviting someone never waits on (or fails because of) email delivery.

```
auth / api --> SQS (oopsly-noti-<env>) --> noti Lambda --SMTP--> inbox
                     |
                     +-- 3 failed attempts --> dead-letter queue
```

## Events

Every message is `{"type": ..., "to": "<one email>", "data": {...}}`.

| type | sent when | `data` |
|---|---|---|
| `otp` | someone asks for a login or signup code | `code` (required), `name` |
| `welcome` | a user signs up for the first time | `name` |
| `community_invite` | a user is added to a community | `communityName` (required), `inviterName`, `name` |
| `study_reminder` | a user asks for their study schedule by email | `ics` (required): the iCalendar body, attached as `oopsly-learning.ics` |

The calendar event is called **Learning on Oopsly**. `name` greets the user and falls back to
the part of the address before the `@`.

Who publishes what:

- **auth** publishes `otp`, `welcome` and `study_reminder` itself (`app/mail.py`, `SqsSender`).
  It does nothing when `NOTI_QUEUE_URL` is empty (local development), and only logs.
- **api** asks auth to publish `community_invite` (`POST /internal/v1/notifications/community-invite`),
  because auth owns user emails.

A message that is not valid JSON, has an unknown type or a bad address can never succeed, so it is
logged and dropped. Any other failure (SMTP down) puts only that message back on the queue; after
three tries it moves to the dead-letter queue.

## SMTP settings

Stored as JSON in the Secrets Manager secret `oopsly-<env>-smtp`:

```json
{"host": "smtp.example.com", "port": 587, "username": "...", "password": "...", "from_email": "Oopsly <no-reply@example.com>"}
```

Port 465 uses implicit TLS; any other port upgrades with STARTTLS. The deployment fills the secret
from the GitHub Environment (variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_FROM`, secret
`SMTP_PASSWORD`; see `deployment/README.md`). Set `APP_URL` for the links in emails.

## Develop

Standard library only (boto3 comes with the Lambda runtime), so there is no build step.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -e '.[dev]'
pytest --cov      # fails below 90% coverage
ruff check . && ruff format --check .
```

Deploy with `deployment/deploy.sh <env> <tag> noti` or the **Release** workflow (service `noti`).
