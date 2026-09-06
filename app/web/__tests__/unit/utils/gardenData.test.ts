import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_SEED_INVENTORY,
    GHIBLI_QUOTES,
    PLANT_SPECIES_CATALOG,
    getInitialGardenState,
    getRandomSeedDrop,
    loadGardenState,
    saveGardenState,
} from '@/utils/gardenData';

describe('garden data utilities', () => {
    beforeEach(() => localStorage.clear());

    it('creates a valid starter garden with unlocked center plots and a starter tree', () => {
        const state = getInitialGardenState();
        expect(state.plots).toHaveLength(16);
        expect(state.plots.filter((plot) => plot.isUnlocked)).toHaveLength(4);
        expect(state.plantedTrees[0]).toMatchObject({
            plotIndex: 5,
            species: 'camphor_tree',
        });
        expect(state.seedInventory).toEqual(DEFAULT_SEED_INVENTORY);
        expect(GHIBLI_QUOTES.length).toBeGreaterThan(0);
        expect(Object.keys(PLANT_SPECIES_CATALOG)).toHaveLength(8);
    });

    it('selects each seed rarity branch based on focus and random roll', () => {
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.8)
            .mockReturnValueOnce(0.2)
            .mockReturnValueOnce(0.9)
            .mockReturnValueOnce(0.1)
            .mockReturnValueOnce(0.7)
            .mockReturnValueOnce(0.9);
        expect(getRandomSeedDrop(45).species).toBe('sky_bonsai');
        expect(getRandomSeedDrop(45).species).toBe('kodama_mushrooms');
        expect(getRandomSeedDrop(25).species).toBe('cherry_blossom');
        expect(getRandomSeedDrop(25).species).toBe('camphor_tree');
        expect(getRandomSeedDrop(10).species).toBe('wildflower_meadow');
        expect(getRandomSeedDrop(10).species).toBe('citrus_grove');
        expect(getRandomSeedDrop(10).species).toBe('cherry_blossom');
        vi.restoreAllMocks();
    });

    it('loads valid saved state with defaults and recovers from malformed storage', () => {
        const initial = getInitialGardenState();
        localStorage.setItem(
            'oopsly_ghibli_garden',
            JSON.stringify({
                plots: [],
                plantedTrees: [],
                seedInventory: { sky_bonsai: 2 },
                growthPoints: 'bad',
            })
        );
        const loaded = loadGardenState();
        expect(loaded.plots).toEqual([]);
        expect(loaded.growthPoints).toBe(100);
        expect(loaded.seedInventory.sky_bonsai).toBe(2);
        expect(loaded.seedInventory.camphor_tree).toBe(1);
        expect(loaded.totalXpContributed).toBe(0);
        saveGardenState(initial);
        expect(
            JSON.parse(localStorage.getItem('oopsly_ghibli_garden')!)
                .forestLevel
        ).toBe(1);
        localStorage.setItem('oopsly_ghibli_garden', '{bad json');
        expect(loadGardenState().plots).toHaveLength(16);
    });
});
