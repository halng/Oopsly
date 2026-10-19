import { GardenState, PlantSpecies, PlantStage } from '@/types';
import { PLANT_SPECIES_CATALOG } from '@/utils/gardenData';
import { GameReward } from '@/services/gameApi';

const STAGES: PlantStage[] = ['seed', 'sprout', 'sapling', 'blooming', 'ancient'];
const WATER_DEW_COST = 5;
const WATER_LEVEL_GAIN = 25;
const WATER_GROWTH_GAIN = 10;
const STAGE_THRESHOLD = 100;

function grow(stage: PlantStage, progress: number, growth: number) {
    let nextStage = stage;
    let nextProgress = progress + growth;
    while (nextProgress >= STAGE_THRESHOLD && nextStage !== 'ancient') {
        nextProgress -= STAGE_THRESHOLD;
        nextStage = STAGES[STAGES.indexOf(nextStage) + 1] ?? 'ancient';
    }
    if (nextStage === 'ancient') nextProgress = STAGE_THRESHOLD;
    return { stage: nextStage, growthProgress: nextProgress };
}

export function pourTree(garden: GardenState, treeId: string): GardenState | null {
    const tree = garden.plantedTrees.find((item) => item.id === treeId);
    if (!tree || garden.dewDrops < WATER_DEW_COST) return null;
    const grown = grow(tree.stage, tree.growthProgress, WATER_GROWTH_GAIN);
    return {
        ...garden,
        dewDrops: garden.dewDrops - WATER_DEW_COST,
        plantedTrees: garden.plantedTrees.map((item) =>
            item.id === treeId
                ? {
                      ...item,
                      waterLevel: Math.min(100, item.waterLevel + WATER_LEVEL_GAIN),
                      totalWaters: item.totalWaters + 1,
                      stage: grown.stage,
                      growthProgress: grown.growthProgress,
                  }
                : item
        ),
    };
}

export function gatherTree(
    garden: GardenState,
    treeId: string
): { garden: GardenState; reward: GameReward } | null {
    const tree = garden.plantedTrees.find((item) => item.id === treeId);
    if (!tree || (tree.stage !== 'blooming' && tree.stage !== 'ancient')) {
        return null;
    }
    const payout = PLANT_SPECIES_CATALOG[tree.species].bloomReward;
    const multiplier = tree.stage === 'ancient' ? 2 : 1;
    const next: GardenState = {
        ...garden,
        dewDrops: garden.dewDrops + payout.dewDrops * multiplier,
        forestCoins: garden.forestCoins + payout.forestCoins * multiplier,
        totalXpContributed:
            (garden.totalXpContributed || 0) + payout.xp * multiplier,
        plantedTrees: garden.plantedTrees.filter((item) => item.id !== treeId),
        plots: garden.plots.map((plot) =>
            plot.plantId === treeId ? { ...plot, plantId: undefined } : plot
        ),
    };
    return {
        garden: next,
        reward: {
            species: tree.species,
            rarity: PLANT_SPECIES_CATALOG[tree.species].rarity,
            dewDropsGained: payout.dewDrops * multiplier,
            sunlightOrbsGained: 0,
            forestCoinsGained: payout.forestCoins * multiplier,
            growthPointsGained: 0,
            xpGained: payout.xp * multiplier,
            garden: next,
        },
    };
}

export function sowSeed(
    garden: GardenState,
    species: PlantSpecies,
    plotIndex: number,
    treeId: string
): GardenState | null {
    const plot = garden.plots.find((item) => item.index === plotIndex);
    if (!plot?.isUnlocked) return null;
    if (garden.plantedTrees.some((item) => item.plotIndex === plotIndex)) {
        return null;
    }
    if ((garden.seedInventory[species] || 0) <= 0) return null;
    return {
        ...garden,
        seedInventory: {
            ...garden.seedInventory,
            [species]: garden.seedInventory[species] - 1,
        },
        plots: garden.plots.map((item) =>
            item.index === plotIndex ? { ...item, plantId: treeId } : item
        ),
        plantedTrees: [
            ...garden.plantedTrees,
            {
                id: treeId,
                plotIndex,
                species,
                stage: 'seed',
                waterLevel: 50,
                growthProgress: 0,
                plantedAt: new Date().toISOString(),
                totalWaters: 0,
            },
        ],
    };
}

export function openPlot(garden: GardenState, plotIndex: number): GardenState | null {
    const plot = garden.plots.find((item) => item.index === plotIndex);
    if (!plot || plot.isUnlocked) return garden;
    if (garden.forestCoins < plot.unlockCost) return null;
    return {
        ...garden,
        forestCoins: garden.forestCoins - plot.unlockCost,
        plots: garden.plots.map((item) =>
            item.index === plotIndex ? { ...item, isUnlocked: true } : item
        ),
    };
}
