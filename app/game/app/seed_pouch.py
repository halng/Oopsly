"""Pure seed-pouch roll. Tests pass a fixed unit roll in [0, 1]."""

from itertools import accumulate

from app.rules import BAND_WEIGHTS, BANDS, RARITY_SPECIES

RARITIES = ("Common", "Rare", "Mythic", "Legendary")


def band_for_focus(minutes: int) -> str:
    if minutes < 15:
        return "short"
    if minutes < 25:
        return "steady"
    if minutes < 45:
        return "strong"
    return "deep"


def band_for_review(cards_reviewed: int, good: int, easy: int) -> str:
    if cards_reviewed < 5:
        band = "short"
    elif cards_reviewed < 10:
        band = "steady"
    elif cards_reviewed < 20:
        band = "strong"
    else:
        band = "deep"
    if cards_reviewed > 0 and (good + easy) * 10 >= cards_reviewed * 7:
        band = BANDS[min(BANDS.index(band) + 1, len(BANDS) - 1)]
    return band


def band_for_test(percentage: int) -> str:
    if percentage < 50:
        return "short"
    if percentage < 70:
        return "steady"
    if percentage < 90:
        return "strong"
    return "deep"


def focus_gains(minutes: int) -> dict[str, int]:
    return {
        "dew_drops": 10,
        "sunlight_orbs": 5,
        "forest_coins": 8,
        "growth_points": minutes * 2,
    }


def review_gains(cards_reviewed: int) -> dict[str, int]:
    return {
        "dew_drops": min(cards_reviewed, 10),
        "sunlight_orbs": cards_reviewed // 5,
        "forest_coins": max(1, cards_reviewed // 2),
        "growth_points": cards_reviewed * 2,
    }


def gains_for_test(percentage: int) -> dict[str, int]:
    return {
        "dew_drops": 10,
        "sunlight_orbs": 5 if percentage >= 70 else 2,
        "forest_coins": percentage // 10,
        "growth_points": percentage // 5,
    }


def roll(band: str, unit_roll: float) -> tuple[str, str]:
    """Return (species, rarity) for a band and a roll in [0, 1]."""
    weights = BAND_WEIGHTS[band]
    points = min(max(unit_roll, 0.0), 1.0) * 100
    if points >= 100:
        points = 99.999
    edges = accumulate(weights)
    rarity, weight, lower = next(
        (name, weight, edge - weight)
        for name, weight, edge in zip(RARITIES, weights, edges, strict=True)
        if weight and points < edge
    )
    species = RARITY_SPECIES[rarity]
    position = (points - lower) / weight
    index = min(len(species) - 1, int(position * len(species)))
    return species[index], rarity
