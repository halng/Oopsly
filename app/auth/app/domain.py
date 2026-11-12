from datetime import UTC, datetime

ROLE_USER = "USER"

PLAN_FREE = "FREE"
PLAN_PRO = "PRO"
PLAN_PRO_PLUS = "PRO_PLUS"
# Plans and prices are on hold: everyone who signs up starts on the top plan, for good.
# Set this back to PLAN_FREE to start new accounts on the free plan again.
NEW_USER_PLAN = PLAN_PRO_PLUS

STATUS_ACTIVE = "ACTIVE"
STATUS_EXPIRED = "EXPIRED"

THEME_IDS = (
    "ghibli-meadow",
    "ghibli-laputa",
    "ghibli-howl",
    "ghibli-kiki",
    "ghibli-night",
    "botanical",
    "obsidian",
    "midnight",
    "sunset",
    "nordic",
    "emerald",
)
LANGUAGE_CODES = {"ENGLISH": "en", "VIETNAMESE": "vi", "SPANISH": "es"}
PLANS = (PLAN_FREE, PLAN_PRO, PLAN_PRO_PLUS)


def utc(value: datetime | None) -> datetime | None:
    """Databases without timezone support (SQLite) hand back naive UTC datetimes."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def parse_theme(value: str) -> str | None:
    theme = value.strip().lower()
    return theme if theme in THEME_IDS else None


def parse_language(code: str) -> str | None:
    return next(
        (name for name, c in LANGUAGE_CODES.items() if c.lower() == code.lower()),
        None,
    )


def language_code(name: str) -> str:
    return LANGUAGE_CODES.get(name, "en")


def valid_plan(plan: str) -> bool:
    return plan in PLANS


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
