# noti

AWS Lambda that sends Quizi's emails. Other services never talk to the mail provider: they invoke
this function directly with a template name and its data. It renders the template and sends it
through the [Resend](https://resend.com) API, so signing up or inviting someone never waits on (or
fails because of) email delivery.

```
auth / api --lambda:Invoke (async)--> quizi-noti-<env> --HTTPS--> Resend --> inbox
```

## Events

Every invocation payload is `{"template": ..., "to": "<one email>", "data": {...}}`.

| template | sent when | `data` |
|---|---|---|
| `otp` | someone asks for a login or signup code | `code` (required), `name` |
| `welcome` | a user signs up for the first time | `name` |
| `community_invite` | a user is added to a community | `communityName` (required), `inviterName`, `name` |
| `study_reminder` | a user asks for their study schedule by email | `ics` (required): the iCalendar body, attached as `quizi-learning.ics` |

The calendar event is called **Learning on Quizi**. `name` greets the user and falls back to
the part of the address before the `@`.

Who invokes what:

- **auth** invokes `otp`, `welcome` and `study_reminder` itself (`app/mail.py`, `LambdaSender`).
  It does nothing when `NOTI_FUNCTION_NAME` is empty (local development), and only logs.
- **api** asks auth to invoke `community_invite` (`POST /internal/v1/notifications/community-invite`),
  because auth owns user emails.

Callers use `InvocationType="Event"`. A payload that is not an object, has an unknown template or a
bad address can never succeed, so it is logged and dropped. Any other failure (Resend down, bad key)
makes the function raise, and Lambda retries the invocation twice before giving up.

## Resend settings

Stored as JSON in the Secrets Manager secret `quizi-<env>-resend`:

```json
{"api_key": "re_...", "from_email": "Quizi <no-reply@quizi.tech>"}
```

The sender domain must be verified in Resend. The deployment fills the secret from the GitHub
Environment (variable `RESEND_FROM`, secret `RESEND_API_KEY`; see `deployment/README.md`). Set
`APP_URL` for the links in emails.

## Develop

Standard library only (boto3 comes with the Lambda runtime), so there is no build step. Tests mock
the Resend HTTP call.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -e '.[dev]'
pytest --cov      # fails below 90% coverage
ruff check . && ruff format --check .
```

Deploy with `deployment/deploy.sh <env> <tag> noti` or the **Release** workflow (service `noti`).
