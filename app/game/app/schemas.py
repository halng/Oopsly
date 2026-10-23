from pydantic import BaseModel, ConfigDict, Field


class GardenTree(BaseModel):
    id: str
    plot_index: int = Field(serialization_alias="plotIndex")
    species: str
    stage: str
    water_level: int = Field(serialization_alias="waterLevel")
    growth_progress: int = Field(serialization_alias="growthProgress")
    planted_at: str = Field(serialization_alias="plantedAt")
    last_watered_at: str | None = Field(serialization_alias="lastWateredAt")
    total_waters: int = Field(serialization_alias="totalWaters")
    nickname: str | None = None


class GardenPlot(BaseModel):
    index: int
    is_unlocked: bool = Field(serialization_alias="isUnlocked")
    unlock_cost: int = Field(serialization_alias="unlockCost")
    plant_id: str | None = Field(default=None, serialization_alias="plantId")


class GardenState(BaseModel):
    plots: list[GardenPlot]
    planted_trees: list[GardenTree] = Field(serialization_alias="plantedTrees")
    dew_drops: int = Field(serialization_alias="dewDrops")
    sunlight_orbs: int = Field(serialization_alias="sunlightOrbs")
    growth_points: int = Field(serialization_alias="growthPoints")
    forest_coins: int = Field(serialization_alias="forestCoins")
    seed_inventory: dict[str, int] = Field(serialization_alias="seedInventory")
    forest_level: int = Field(serialization_alias="forestLevel")
    total_focus_minutes: int = Field(serialization_alias="totalFocusMinutes")
    completed_sessions_count: int = Field(serialization_alias="completedSessionsCount")
    total_xp_contributed: int = Field(serialization_alias="totalXpContributed")
    active_weather: str = Field(serialization_alias="activeWeather")


class Reward(BaseModel):
    species: str
    rarity: str
    dew_drops_gained: int = Field(serialization_alias="dewDropsGained")
    sunlight_orbs_gained: int = Field(serialization_alias="sunlightOrbsGained")
    forest_coins_gained: int = Field(serialization_alias="forestCoinsGained")
    growth_points_gained: int = Field(serialization_alias="growthPointsGained")
    xp_gained: int = Field(serialization_alias="xpGained")
    garden: GardenState


class PlantReq(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    species: str
    plot_index: int = Field(alias="plotIndex")
    nickname: str | None = None


class TreeReq(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tree_id: str = Field(alias="treeId")


class UnlockReq(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plot_index: int = Field(alias="plotIndex")


class FocusReq(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    focus_minutes: int = Field(alias="focusMinutes", ge=1)


class ReviewReq(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cards_reviewed: int = Field(alias="cardsReviewed", ge=1)
    again: int = Field(ge=0)
    hard: int = Field(ge=0)
    good: int = Field(ge=0)
    easy: int = Field(ge=0)


class TestReq(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    percentage: int = Field(ge=0, le=100)
