import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Garden, Plot, Tree
from app.rules import (
    BLOOM_REWARDS,
    FOREST_LEVEL_STEP,
    FREE_PLOTS,
    PLOT_COUNT,
    SPECIES,
    SPECIES_RARITY,
    STAGE_THRESHOLD,
    STARTER_DEW,
    WATER_DEW_COST,
    WATER_GROWTH_GAIN,
    WATER_LEVEL_GAIN,
    next_stage,
    unlock_cost,
)
from app.schemas import GardenPlot, GardenState, GardenTree, Reward
from app.seed_pouch import (
    band_for_focus,
    band_for_review,
    band_for_test,
    focus_gains,
    review_gains,
    roll,
    gains_for_test,
)


class GameError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _inventory(garden: Garden) -> dict[str, int]:
    stored = dict(garden.seed_inventory or {})
    return {species: int(stored.get(species, 0)) for species in SPECIES}


def _level(growth_points: int) -> int:
    return 1 + growth_points // FOREST_LEVEL_STEP


def to_state(garden: Garden) -> GardenState:
    trees = sorted(garden.trees, key=lambda tree: tree.plot_index)
    tree_by_plot = {tree.plot_index: tree.id for tree in trees}
    plots = sorted(garden.plots, key=lambda plot: plot.plot_index)
    return GardenState(
        plots=[
            GardenPlot(
                index=plot.plot_index,
                is_unlocked=plot.is_unlocked,
                unlock_cost=plot.unlock_cost,
                plant_id=tree_by_plot.get(plot.plot_index),
            )
            for plot in plots
        ],
        planted_trees=[
            GardenTree(
                id=tree.id,
                plot_index=tree.plot_index,
                species=tree.species,
                stage=tree.stage,
                water_level=tree.water_level,
                growth_progress=tree.growth_progress,
                planted_at=_iso(tree.planted_at) or "",
                last_watered_at=_iso(tree.last_watered_at),
                total_waters=tree.total_waters,
                nickname=tree.nickname,
            )
            for tree in trees
        ],
        dew_drops=garden.dew_drops,
        sunlight_orbs=garden.sunlight_orbs,
        growth_points=garden.growth_points,
        forest_coins=garden.forest_coins,
        seed_inventory=_inventory(garden),
        forest_level=garden.forest_level,
        total_focus_minutes=garden.total_focus_minutes,
        completed_sessions_count=garden.completed_sessions_count,
        total_xp_contributed=garden.total_xp_contributed,
        active_weather=garden.active_weather,
    )


def _load_garden(db: Session, user_id: str) -> Garden | None:
    return db.scalar(select(Garden).where(Garden.user_id == user_id))


def get_or_create_garden(db: Session, user_id: str) -> Garden:
    garden = _load_garden(db, user_id)
    if garden is not None:
        return garden
    inventory = {species: 0 for species in SPECIES}
    inventory["camphor_tree"] = 1
    garden = Garden(
        user_id=user_id,
        dew_drops=STARTER_DEW,
        seed_inventory=inventory,
        forest_level=1,
        active_weather="sunny",
    )
    try:
        with db.begin_nested():
            db.add(garden)
            db.flush()
            for index in range(PLOT_COUNT):
                db.add(
                    Plot(
                        garden_id=garden.id,
                        plot_index=index,
                        is_unlocked=index < FREE_PLOTS,
                        unlock_cost=unlock_cost(index),
                    )
                )
        db.commit()
        db.refresh(garden)
        return garden
    except IntegrityError:
        db.rollback()
        garden = _load_garden(db, user_id)
        if garden is None:
            raise
        return garden


def _plot(garden: Garden, plot_index: int) -> Plot:
    for plot in garden.plots:
        if plot.plot_index == plot_index:
            return plot
    raise GameError("Land plot not found")


def _tree(garden: Garden, tree_id: str) -> Tree:
    for tree in garden.trees:
        if tree.id == tree_id:
            return tree
    raise GameError("Plant not found in your garden")


def _tree_on_plot(garden: Garden, plot_index: int) -> Tree | None:
    for tree in garden.trees:
        if tree.plot_index == plot_index:
            return tree
    return None


def apply_growth(tree: Tree, growth: int) -> None:
    progress = tree.growth_progress + growth
    while progress >= STAGE_THRESHOLD and tree.stage != "ancient":
        progress -= STAGE_THRESHOLD
        tree.stage = next_stage(tree.stage)
    if tree.stage == "ancient":
        tree.growth_progress = STAGE_THRESHOLD
    else:
        tree.growth_progress = progress


def _share_growth(garden: Garden, growth: int) -> None:
    if growth <= 0 or not garden.trees:
        return
    share = max(1, growth // len(garden.trees))
    for tree in garden.trees:
        apply_growth(tree, share)


def _add_seed(garden: Garden, species: str) -> None:
    inventory = _inventory(garden)
    inventory[species] = inventory.get(species, 0) + 1
    garden.seed_inventory = inventory


def _grant(garden: Garden, gains: dict[str, int], species: str) -> None:
    garden.dew_drops += gains["dew_drops"]
    garden.sunlight_orbs += gains["sunlight_orbs"]
    garden.forest_coins += gains["forest_coins"]
    garden.growth_points += gains["growth_points"]
    garden.forest_level = _level(garden.growth_points)
    _add_seed(garden, species)
    _share_growth(garden, gains["growth_points"])


def _reward(garden: Garden, species: str, rarity: str, gains: dict[str, int], xp: int = 0) -> Reward:
    return Reward(
        species=species,
        rarity=rarity,
        dew_drops_gained=gains["dew_drops"],
        sunlight_orbs_gained=gains["sunlight_orbs"],
        forest_coins_gained=gains["forest_coins"],
        growth_points_gained=gains["growth_points"],
        xp_gained=xp,
        garden=to_state(garden),
    )


def _roll_unit() -> float:
    return random.random()


def reward_focus(db: Session, user_id: str, minutes: int, unit_roll: float | None = None) -> Reward:
    garden = get_or_create_garden(db, user_id)
    species, rarity = roll(band_for_focus(minutes), _roll_unit() if unit_roll is None else unit_roll)
    gains = focus_gains(minutes)
    _grant(garden, gains, species)
    garden.total_focus_minutes += minutes
    garden.completed_sessions_count += 1
    db.commit()
    db.refresh(garden)
    return _reward(garden, species, rarity, gains)


def reward_review(
    db: Session,
    user_id: str,
    cards_reviewed: int,
    good: int,
    easy: int,
    unit_roll: float | None = None,
) -> Reward:
    garden = get_or_create_garden(db, user_id)
    band = band_for_review(cards_reviewed, good, easy)
    species, rarity = roll(band, _roll_unit() if unit_roll is None else unit_roll)
    gains = review_gains(cards_reviewed)
    _grant(garden, gains, species)
    db.commit()
    db.refresh(garden)
    return _reward(garden, species, rarity, gains)


def reward_test(db: Session, user_id: str, percentage: int, unit_roll: float | None = None) -> Reward:
    garden = get_or_create_garden(db, user_id)
    species, rarity = roll(band_for_test(percentage), _roll_unit() if unit_roll is None else unit_roll)
    gains = gains_for_test(percentage)
    _grant(garden, gains, species)
    db.commit()
    db.refresh(garden)
    return _reward(garden, species, rarity, gains)


def plant_seed(
    db: Session, user_id: str, species: str, plot_index: int, nickname: str | None
) -> GardenState:
    if species not in SPECIES:
        raise GameError("Unknown seed")
    garden = get_or_create_garden(db, user_id)
    plot = _plot(garden, plot_index)
    if not plot.is_unlocked:
        raise GameError("This land plot is still locked")
    if _tree_on_plot(garden, plot_index) is not None:
        raise GameError("This land plot already has a plant")
    inventory = _inventory(garden)
    if inventory.get(species, 0) <= 0:
        raise GameError("You do not have this seed in your inventory")
    inventory[species] -= 1
    garden.seed_inventory = inventory
    db.add(
        Tree(
            garden_id=garden.id,
            plot_index=plot_index,
            species=species,
            stage="seed",
            water_level=50,
            growth_progress=0,
            nickname=nickname,
            planted_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    db.refresh(garden)
    return to_state(garden)


def water_tree(db: Session, user_id: str, tree_id: str) -> GardenState:
    garden = get_or_create_garden(db, user_id)
    tree = _tree(garden, tree_id)
    if garden.dew_drops < WATER_DEW_COST:
        raise GameError("Not enough dew drops to water")
    garden.dew_drops -= WATER_DEW_COST
    tree.water_level = min(100, tree.water_level + WATER_LEVEL_GAIN)
    tree.total_waters += 1
    tree.last_watered_at = datetime.now(timezone.utc)
    apply_growth(tree, WATER_GROWTH_GAIN)
    db.commit()
    db.refresh(garden)
    return to_state(garden)


def unlock_plot(db: Session, user_id: str, plot_index: int) -> GardenState:
    garden = get_or_create_garden(db, user_id)
    plot = _plot(garden, plot_index)
    if plot.is_unlocked:
        return to_state(garden)
    if garden.forest_coins < plot.unlock_cost:
        raise GameError("Not enough forest coins to unlock")
    garden.forest_coins -= plot.unlock_cost
    plot.is_unlocked = True
    db.commit()
    db.refresh(garden)
    return to_state(garden)


def harvest_tree(db: Session, user_id: str, tree_id: str) -> Reward:
    garden = get_or_create_garden(db, user_id)
    tree = _tree(garden, tree_id)
    if tree.stage not in ("blooming", "ancient"):
        raise GameError("This plant is not ready to harvest")
    payout = BLOOM_REWARDS[tree.species]
    multiplier = 2 if tree.stage == "ancient" else 1
    dew = payout.dew_drops * multiplier
    coins = payout.forest_coins * multiplier
    xp = payout.xp * multiplier
    garden.dew_drops += dew
    garden.forest_coins += coins
    garden.total_xp_contributed += xp
    species = tree.species
    rarity = SPECIES_RARITY[species]
    db.delete(tree)
    db.commit()
    db.refresh(garden)
    gains = {
        "dew_drops": dew,
        "sunlight_orbs": 0,
        "forest_coins": coins,
        "growth_points": 0,
    }
    return _reward(garden, species, rarity, gains, xp=xp)
