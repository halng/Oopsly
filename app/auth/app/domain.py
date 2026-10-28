from datetime import UTC, datetime

ROLE_USER = "USER"
ROLE_ADMIN = "ADMIN"

PLAN_FREE = "FREE"
PLAN_PRO = "PRO"
PLAN_PRO_PLUS = "PRO_PLUS"

STATUS_ACTIVE = "ACTIVE"
STATUS_EXPIRED = "EXPIRED"

THEMES = ("LIGHT", "DARK", "SYSTEM")
LANGUAGE_CODES = {"ENGLISH": "en", "VIETNAMESE": "vi", "SPANISH": "es"}
PLAN_RANK = {PLAN_FREE: 0, PLAN_PRO: 1, PLAN_PRO_PLUS: 2}


def utc(value: datetime | None) -> datetime | None:
    """Databases without timezone support (SQLite) hand back naive UTC datetimes."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def parse_theme(value: str) -> str | None:
    return next((t for t in THEMES if t.lower() == value.lower()), None)


def parse_language(code: str) -> str | None:
    return next(
        (name for name, c in LANGUAGE_CODES.items() if c.lower() == code.lower()),
        None,
    )


def language_code(name: str) -> str:
    return LANGUAGE_CODES.get(name, "en")


def valid_plan(plan: str) -> bool:
    return plan in PLAN_RANK


def plan_at_least(have: str, minimum: str) -> bool:
    return (
        have in PLAN_RANK
        and minimum in PLAN_RANK
        and (PLAN_RANK[have] >= PLAN_RANK[minimum])
    )


def effective_subscription(
    plan: str | None,
    status: str | None,
    expires_at: datetime | None,
    now: datetime,
) -> tuple[str, str, datetime | None]:
    """Downgrades an expired paid subscription to FREE."""
    expires_at = utc(expires_at)
    if not plan:
        return PLAN_FREE, STATUS_ACTIVE, None
    if expires_at is not None and expires_at <= now and plan != PLAN_FREE:
        return PLAN_FREE, STATUS_EXPIRED, expires_at
    return plan, status or STATUS_ACTIVE, expires_at
