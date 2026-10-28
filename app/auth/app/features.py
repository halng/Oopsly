"""Feature toggles.

A feature has a common value, which applies to every visitor (signed in or not),
and optional per-plan values. A value set for the caller's plan wins over the
common one, so a subscription can both unlock and switch off a feature.
"""

from dataclasses import dataclass, field

from app import domain

SOURCE_COMMON = "common"
SOURCE_SUBSCRIPTION = "subscription"


@dataclass(frozen=True)
class Feature:
    key: str
    description: str
    common: bool
    plans: dict[str, bool] = field(default_factory=dict)


FEATURES: tuple[Feature, ...] = (
    Feature("quiz.play", "Play quiz games", common=True),
    Feature("game.create", "Host a quiz game", common=True),
    Feature("review.basic", "Spaced-repetition review", common=True),
    Feature(
        "ai.hint",
        "AI generated hints",
        common=False,
        plans={domain.PLAN_PRO: True, domain.PLAN_PRO_PLUS: True},
    ),
    Feature(
        "analytics.advanced",
        "Advanced learning analytics",
        common=False,
        plans={domain.PLAN_PRO_PLUS: True},
    ),
    Feature(
        "ads",
        "Show advertisements",
        common=True,
        plans={domain.PLAN_PRO: False, domain.PLAN_PRO_PLUS: False},
    ),
)

_BY_KEY = {f.key: f for f in FEATURES}


def find(key: str) -> Feature | None:
    return _BY_KEY.get(key)


def resolve(feature: Feature, plan: str | None) -> dict:
    """plan is None for a visitor, who only gets the common value."""
    if plan is not None and plan in feature.plans:
        return {"enabled": feature.plans[plan], "source": SOURCE_SUBSCRIPTION}
    return {"enabled": feature.common, "source": SOURCE_COMMON}
