import axios, { AxiosError } from 'axios';
import { ulid } from 'ulid';
import { installTokenRefresh } from './tokenRefresh';
import { ApiResponse, GardenState, PlantSpecies, PlantStage } from '@/types';

const gameClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_GAME_API_URL || 'http://localhost:8000',
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

installTokenRefresh(gameClient);

gameClient.interceptors.request.use((config) => {
    config.headers['X-Request-ID'] = ulid();
    config.headers['X-Platform'] = 'WEB';
    return config;
});

export interface GameReward {
    species: PlantSpecies;
    rarity: string;
    dewDropsGained: number;
    sunlightOrbsGained: number;
    forestCoinsGained: number;
    growthPointsGained: number;
    xpGained: number;
    garden: GardenState;
}

export interface ReviewRewardInput {
    cardsReviewed: number;
    again: number;
    hard: number;
    good: number;
    easy: number;
}

const SPECIES: PlantSpecies[] = [
    'camphor_tree',
    'cherry_blossom',
    'sky_bonsai',
    'wildflower_meadow',
    'kodama_mushrooms',
    'citrus_grove',
    'spirit_lotus',
    'golden_ginkgo',
];

const STAGES: PlantStage[] = [
    'seed',
    'sprout',
    'sapling',
    'blooming',
    'ancient',
];

function asSpecies(value: string): PlantSpecies {
    const key = value.toLowerCase() as PlantSpecies;
    return SPECIES.includes(key) ? key : 'wildflower_meadow';
}

function asStage(value: string): PlantStage {
    const key = value.toLowerCase() as PlantStage;
    return STAGES.includes(key) ? key : 'seed';
}

export function normalizeGarden(garden: GardenState): GardenState {
    const inventory = {} as Record<PlantSpecies, number>;
    for (const species of SPECIES) {
        const raw = garden.seedInventory as Record<string, number>;
        inventory[species] =
            raw?.[species] ?? raw?.[species.toUpperCase()] ?? 0;
    }
    return {
        ...garden,
        seedInventory: inventory,
        plantedTrees: (garden.plantedTrees || []).map((tree) => ({
            ...tree,
            species: asSpecies(tree.species),
            stage: asStage(tree.stage),
        })),
        activeWeather: garden.activeWeather || 'sunny',
    };
}

export function normalizeReward(reward: GameReward): GameReward {
    return {
        ...reward,
        species: asSpecies(reward.species),
        garden: normalizeGarden(reward.garden),
    };
}

async function request<T>(
    url: string,
    method: 'GET' | 'POST',
    body?: unknown
): Promise<ApiResponse<T>> {
    try {
        const res = await gameClient.request<ApiResponse<T>>({
            url,
            method,
            data: body,
        });
        return res.data;
    } catch (error) {
        const axiosError = error as AxiosError<ApiResponse<T>>;
        return {
            isSuccess: false,
            statusCode: axiosError.response?.status || 200,
            message:
                axiosError.response?.data?.message ||
                axiosError.message ||
                'Network error occurred',
            data: null,
            timestamp: new Date().toISOString(),
        };
    }
}

export const GameService = {
    getGarden: async (): Promise<ApiResponse<GardenState>> => {
        const res = await request<GardenState>('/v1/game/garden', 'GET');
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeGarden(res.data) };
        }
        return res;
    },

    plant: async (
        species: PlantSpecies,
        plotIndex: number,
        nickname?: string
    ): Promise<ApiResponse<GardenState>> => {
        const res = await request<GardenState>('/v1/game/plants', 'POST', {
            species,
            plotIndex,
            nickname,
        });
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeGarden(res.data) };
        }
        return res;
    },

    water: async (treeId: string): Promise<ApiResponse<GardenState>> => {
        const res = await request<GardenState>(
            '/v1/game/plants/water',
            'POST',
            {
                treeId,
            }
        );
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeGarden(res.data) };
        }
        return res;
    },

    unlock: async (plotIndex: number): Promise<ApiResponse<GardenState>> => {
        const res = await request<GardenState>(
            '/v1/game/plots/unlock',
            'POST',
            {
                plotIndex,
            }
        );
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeGarden(res.data) };
        }
        return res;
    },

    harvest: async (treeId: string): Promise<ApiResponse<GameReward>> => {
        const res = await request<GameReward>(
            '/v1/game/plants/harvest',
            'POST',
            {
                treeId,
            }
        );
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeReward(res.data) };
        }
        return res;
    },

    claimFocus: async (
        focusMinutes: number
    ): Promise<ApiResponse<GameReward>> => {
        const res = await request<GameReward>(
            '/v1/game/rewards/focus',
            'POST',
            {
                focusMinutes,
            }
        );
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeReward(res.data) };
        }
        return res;
    },

    claimReview: async (
        input: ReviewRewardInput
    ): Promise<ApiResponse<GameReward>> => {
        const res = await request<GameReward>(
            '/v1/game/rewards/review',
            'POST',
            input
        );
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeReward(res.data) };
        }
        return res;
    },

    claimTest: async (percentage: number): Promise<ApiResponse<GameReward>> => {
        const res = await request<GameReward>('/v1/game/rewards/test', 'POST', {
            percentage,
        });
        if (res.isSuccess && res.data) {
            return { ...res, data: normalizeReward(res.data) };
        }
        return res;
    },
};
