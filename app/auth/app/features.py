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
    # Anyone can join a quiz game; hosting one is for paid plans.
    Feature(
        "game.create",
        "Host a quiz game",
        common=False,
        plans={domain.PLAN_PRO: True, domain.PLAN_PRO_PLUS: True},
    ),
    Feature("review.basic", "Spaced-repetition review", common=True),
    # AI is switched off for everyone for now. To bring it back, set common=True, or
    # give plans={domain.PLAN_PRO: True, domain.PLAN_PRO_PLUS: True} to limit it to
    # paid plans.
    Feature("ai.hint", "AI generated hints", common=False),
    Feature("ai.generate", "AI flashcard generation", common=False),
    # The Garden game on the Study page is switched off for now; only the Pomodoro
    # timer shows.
    Feature("garden.game", "Garden game", common=False),
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
