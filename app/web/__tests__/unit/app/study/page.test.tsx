import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudyPage from '@/app/(user)/study/page';
import { GardenState } from '@/types';
import { GameService } from '@/services/gameApi';
import { sendGardenAction } from '@/services/gameSocket';
import { useAuthStore } from '@/store';

vi.mock('next/dynamic', () => ({
    default: (importer: () => Promise<{ default: React.ComponentType }>) => {
        const Lazy = React.lazy(importer);
        return function DynamicComponent(props: Record<string, unknown>) {
            return (
                <React.Suspense fallback={null}>
                    <Lazy {...props} />
                </React.Suspense>
            );
        };
    },
}));

vi.mock('@/components/garden/GardenCanvas', () => ({
    default: ({
        garden,
        onPlotSelect,
    }: {
        garden: GardenState;
        onPlotSelect: (index: number) => void;
    }) => (
        <div>
            {garden.plots.map((plot) => (
                <button
                    key={plot.index}
                    type="button"
                    data-testid={`garden-plot-${plot.index}`}
                    onClick={() => onPlotSelect(plot.index)}
                >
                    plot
                </button>
            ))}
        </div>
    ),
}));

vi.mock('@/components/garden/PouchReveal', () => ({
    default: ({ species, rarity }: { species: string; rarity: string }) => (
        <div data-testid="seed-pouch">
            {species} {rarity}
        </div>
    ),
}));

vi.mock('@/services/gameSocket', () => ({
    openGameSocket: () => () => undefined,
    sendGardenAction: vi.fn(() => true),
}));

vi.mock('@/services/gameApi', () => ({
    GameService: {
        getGarden: vi.fn(),
        plant: vi.fn(),
        water: vi.fn(),
        unlock: vi.fn(),
        harvest: vi.fn(),
        claimFocus: vi.fn(),
        claimReview: vi.fn(),
        claimTest: vi.fn(),
    },
}));

const garden: GardenState = {
    plots: Array.from({ length: 9 }, (_, index) => ({
        index,
        isUnlocked: index < 3,
        unlockCost: index < 3 ? 0 : 50,
    })),
    plantedTrees: [
        {
            id: 'tree-1',
            plotIndex: 0,
            species: 'camphor_tree',
            stage: 'blooming',
            waterLevel: 50,
            growthProgress: 10,
            plantedAt: '2026-01-01T00:00:00Z',
            totalWaters: 1,
        },
    ],
    dewDrops: 10,
    sunlightOrbs: 0,
    growthPoints: 0,
    forestCoins: 60,
    seedInventory: {
        camphor_tree: 0,
        cherry_blossom: 0,
        sky_bonsai: 0,
        wildflower_meadow: 1,
        kodama_mushrooms: 0,
        citrus_grove: 0,
        spirit_lotus: 0,
        golden_ginkgo: 0,
    },
    forestLevel: 1,
    totalFocusMinutes: 0,
    completedSessionsCount: 0,
    totalXpContributed: 0,
    activeWeather: 'sunny',
};

const ok = <T,>(data: T) => ({
    isSuccess: true,
    data,
    message: 'ok',
    statusCode: 200,
    timestamp: '',
});

describe('StudyPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore
            .getState()
            .setCredentials('learner@oopsly.app', 'token', 'refresh');
        vi.mocked(GameService.getGarden).mockResolvedValue(ok(garden));
        vi.mocked(GameService.plant).mockResolvedValue(ok(garden));
        vi.mocked(GameService.water).mockResolvedValue(ok(garden));
        vi.mocked(GameService.harvest).mockResolvedValue(
            ok({
                species: 'camphor_tree',
                rarity: 'Legendary',
                dewDropsGained: 5,
                sunlightOrbsGained: 0,
                forestCoinsGained: 40,
                growthPointsGained: 0,
                xpGained: 120,
                garden,
            })
        );
        vi.mocked(GameService.claimFocus).mockResolvedValue(
            ok({
                species: 'wildflower_meadow',
                rarity: 'Common',
                dewDropsGained: 10,
                sunlightOrbsGained: 5,
                forestCoinsGained: 8,
                growthPointsGained: 30,
                xpGained: 0,
                garden,
            })
        );
    });

    it('renders pomodoro controls and the saved garden', async () => {
        render(<StudyPage />);
        expect(screen.getByTestId('study-page')).toBeInTheDocument();
        expect(screen.getByTestId('pomodoro-display')).toHaveTextContent(
            '25:00'
        );
        fireEvent.click(screen.getByTestId('btn-duration-15'));
        expect(screen.getByTestId('pomodoro-display')).toHaveTextContent(
            '15:00'
        );
        fireEvent.click(screen.getByTestId('btn-tab-garden'));
        expect(await screen.findByText('Ghibli Garden')).toBeInTheDocument();
        expect(await screen.findByTestId('garden-plot-0')).toBeInTheDocument();
        expect(GameService.getGarden).toHaveBeenCalled();
    });

    it('plants, waters, and harvests on the socket without waiting', async () => {
        render(<StudyPage />);
        fireEvent.click(screen.getByTestId('btn-tab-garden'));
        fireEvent.click(await screen.findByTestId('garden-plot-1'));
        fireEvent.click(
            await screen.findByTestId('btn-plant-wildflower_meadow')
        );
        expect(sendGardenAction).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'plant',
                species: 'wildflower_meadow',
                plotIndex: 1,
            })
        );
        expect(screen.queryByTestId('btn-plant-wildflower_meadow')).toBeNull();

        fireEvent.click(screen.getByTestId('garden-plot-0'));
        expect(screen.getByText(/Dew 10/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-water-tree'));
        expect(sendGardenAction).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'water', treeId: 'tree-1' })
        );
        expect(screen.getByText(/Dew 5/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('btn-harvest-tree'));
        expect(sendGardenAction).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'harvest', treeId: 'tree-1' })
        );
        expect(await screen.findByTestId('seed-pouch')).toHaveTextContent(
            'camphor_tree'
        );
        expect(screen.getByText(/Dew 10/)).toBeInTheDocument();
    });

    it('opens a seed pouch when the focus timer finishes', async () => {
        vi.useFakeTimers();
        render(<StudyPage />);
        fireEvent.click(screen.getByTestId('btn-duration-15'));
        fireEvent.click(screen.getByTestId('btn-pomodoro-toggle'));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
        });
        expect(GameService.claimFocus).toHaveBeenCalledWith(15);
        expect(screen.getByTestId('seed-pouch')).toHaveTextContent(
            'wildflower_meadow'
        );
        vi.useRealTimers();
    });
});
