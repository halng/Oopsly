import { describe, expect, it } from 'vitest';
import { GardenState } from '@/types';
import { getInitialGardenState } from '@/utils/gardenData';
import { gatherTree, openPlot, pourTree, sowSeed } from '@/game/liveGarden';

function garden(): GardenState {
    return getInitialGardenState();
}

function withTree(
    state: GardenState,
    patch: Partial<GardenState['plantedTrees'][number]>
): GardenState {
    return {
        ...state,
        plantedTrees: state.plantedTrees.map((t) => ({ ...t, ...patch })),
    };
}

describe('pourTree', () => {
    it('spends dew, raises water and counts the pour', () => {
        const next = pourTree(garden(), 'tree_starter_camphor')!;
        expect(next.dewDrops).toBe(3);
        expect(next.plantedTrees[0]).toMatchObject({
            waterLevel: 100,
            totalWaters: 2,
            growthProgress: 50,
            stage: 'sprout',
        });
    });

    it('returns null for a missing tree or too little dew', () => {
        expect(pourTree(garden(), 'nope')).toBeNull();
        expect(
            pourTree({ ...garden(), dewDrops: 4 }, 'tree_starter_camphor')
        ).toBeNull();
    });

    it('advances a stage when progress crosses the threshold', () => {
        const next = pourTree(
            withTree(garden(), { growthProgress: 95 }),
            'tree_starter_camphor'
        )!;
        expect(next.plantedTrees[0]).toMatchObject({
            stage: 'sapling',
            growthProgress: 5,
        });
    });

    it('pins ancient trees at full progress', () => {
        const next = pourTree(
            withTree(garden(), { stage: 'ancient', growthProgress: 10 }),
            'tree_starter_camphor'
        )!;
        expect(next.plantedTrees[0]).toMatchObject({
            stage: 'ancient',
            growthProgress: 100,
        });
    });

    it('only changes the targeted tree', () => {
        const base = garden();
        const other = {
            ...base.plantedTrees[0],
            id: 'other',
            plotIndex: 6,
        };
        const next = pourTree(
            { ...base, plantedTrees: [...base.plantedTrees, other] },
            'other'
        )!;
        expect(next.plantedTrees[0].totalWaters).toBe(1);
        expect(next.plantedTrees[1].totalWaters).toBe(2);
    });
});

describe('gatherTree', () => {
    it('refuses unknown or immature trees', () => {
        expect(gatherTree(garden(), 'nope')).toBeNull();
        expect(gatherTree(garden(), 'tree_starter_camphor')).toBeNull();
    });

    it('pays the bloom reward and frees the plot', () => {
        const state = withTree(garden(), { stage: 'blooming' });
        const result = gatherTree(state, 'tree_starter_camphor')!;
        expect(result.garden.plantedTrees).toHaveLength(0);
        expect(result.garden.plots[5].plantId).toBeUndefined();
        expect(result.garden.dewDrops).toBe(state.dewDrops + 5);
        expect(result.garden.forestCoins).toBe(state.forestCoins + 40);
        expect(result.garden.totalXpContributed).toBe(220);
        expect(result.reward).toMatchObject({
            species: 'camphor_tree',
            dewDropsGained: 5,
            forestCoinsGained: 40,
            xpGained: 120,
            sunlightOrbsGained: 0,
            growthPointsGained: 0,
        });
        expect(result.reward.garden).toBe(result.garden);
    });

    it('doubles the payout for ancient trees and tolerates missing xp total', () => {
        const state = {
            ...withTree(garden(), { stage: 'ancient' }),
            totalXpContributed: undefined,
        };
        const result = gatherTree(state, 'tree_starter_camphor')!;
        expect(result.reward.forestCoinsGained).toBe(80);
        expect(result.garden.totalXpContributed).toBe(240);
    });
});

describe('sowSeed', () => {
    it('plants a seed on an unlocked empty plot', () => {
        const base = garden();
        const next = sowSeed(base, 'camphor_tree', 6, 't2')!;
        expect(next.seedInventory.camphor_tree).toBe(
            base.seedInventory.camphor_tree - 1
        );
        expect(next.plots[6].plantId).toBe('t2');
        expect(next.plantedTrees[1]).toMatchObject({
            id: 't2',
            plotIndex: 6,
            stage: 'seed',
            waterLevel: 50,
            totalWaters: 0,
        });
    });

    it('rejects locked, occupied and seedless plots', () => {
        const base = garden();
        expect(sowSeed(base, 'camphor_tree', 99, 'x')).toBeNull();
        expect(sowSeed(base, 'camphor_tree', 0, 'x')).toBeNull();
        expect(sowSeed(base, 'camphor_tree', 5, 'x')).toBeNull();
        expect(
            sowSeed(
                {
                    ...base,
                    seedInventory: { ...base.seedInventory, camphor_tree: 0 },
                },
                'camphor_tree',
                6,
                'x'
            )
        ).toBeNull();
    });
});

describe('openPlot', () => {
    it('unlocks a plot by paying its cost', () => {
        const base = { ...garden(), forestCoins: 100 };
        const cost = base.plots[0].unlockCost;
        const next = openPlot(base, 0)!;
        expect(next.forestCoins).toBe(100 - cost);
        expect(next.plots[0].isUnlocked).toBe(true);
    });

    it('returns the same garden for unknown or already open plots', () => {
        const base = garden();
        expect(openPlot(base, 99)).toBe(base);
        expect(openPlot(base, 5)).toBe(base);
    });

    it('returns null when coins are short', () => {
        expect(openPlot({ ...garden(), forestCoins: 0 }, 0)).toBeNull();
    });
});
