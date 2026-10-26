"""Garden rules. Payout numbers mirror the species catalog in the web app."""

from dataclasses import dataclass

PLOT_COUNT = 9
FREE_PLOTS = 3
PLOT_UNLOCK_COST = 50
WATER_DEW_COST = 5
WATER_LEVEL_GAIN = 25
WATER_GROWTH_GAIN = 10
STAGE_THRESHOLD = 100
FOREST_LEVEL_STEP = 100

FOCUS_DEW = 10
FOCUS_SUNLIGHT = 5
FOCUS_COINS = 8
FOCUS_GROWTH_PER_MINUTE = 2

STARTER_DEW = 10

SPECIES = (
    "wildflower_meadow",
    "citrus_grove",
    "cherry_blossom",
    "kodama_mushrooms",
    "spirit_lotus",
    "sky_bonsai",
    "golden_ginkgo",
    "camphor_tree",
)

RARITY_SPECIES = {
    "Common": ("wildflower_meadow", "citrus_grove"),
    "Rare": ("cherry_blossom", "kodama_mushrooms", "spirit_lotus"),
    "Mythic": ("sky_bonsai", "golden_ginkgo"),
    "Legendary": ("camphor_tree",),
}

BANDS = ("short", "steady", "strong", "deep")

# Weights are out of 100: common, rare, mythic, legendary.
BAND_WEIGHTS = {
    "short": (80, 18, 2, 0),
    "steady": (62, 30, 7, 1),
    "strong": (40, 40, 16, 4),
    "deep": (18, 37, 30, 15),
}

STAGES = ("seed", "sprout", "sapling", "blooming", "ancient")


@dataclass(frozen=True)
class BloomReward:
    dew_drops: int
    forest_coins: int
    xp: int


BLOOM_REWARDS = {
    "camphor_tree": BloomReward(5, 40, 120),
    "cherry_blossom": BloomReward(3, 25, 75),
    "sky_bonsai": BloomReward(8, 65, 200),
    "wildflower_meadow": BloomReward(2, 15, 45),
    "kodama_mushrooms": BloomReward(4, 35, 100),
    "citrus_grove": BloomReward(3, 20, 55),
    "spirit_lotus": BloomReward(5, 40, 110),
    "golden_ginkgo": BloomReward(6, 50, 160),
}

SPECIES_RARITY = {
    species: rarity for rarity, names in RARITY_SPECIES.items() for species in names
}


def next_stage(stage: str) -> str:
    index = STAGES.index(stage)
    if index >= len(STAGES) - 1:
        return STAGES[-1]
    return STAGES[index + 1]


def unlock_cost(plot_index: int) -> int:
    if plot_index < FREE_PLOTS:
        return 0
    return PLOT_UNLOCK_COST * (plot_index - FREE_PLOTS + 1)
