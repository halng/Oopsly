import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getInitialGardenState } from '@/utils/gardenData';

const game = { destroy: vi.fn() };
const createGardenGame = vi.fn((..._args: any[]) => game);
const pushGarden = vi.fn();

vi.mock('@/game/createGardenGame', () => ({
    createGardenGame: (...args: any[]) => createGardenGame(...args),
    pushGarden: (...args: any[]) => pushGarden(...args),
}));

import GardenCanvas from '@/components/garden/GardenCanvas';

describe('GardenCanvas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates the game once inside the canvas container', () => {
        const garden = getInitialGardenState();
        render(<GardenCanvas garden={garden} onPlotSelect={vi.fn()} />);
        const el = screen.getByTestId('garden-canvas');
        expect(createGardenGame).toHaveBeenCalledTimes(1);
        expect(createGardenGame.mock.calls[0][0]).toBe(el);
        expect(createGardenGame.mock.calls[0][2]).toBe(garden);
    });

    it('forwards plot clicks to onPlotSelect', () => {
        const onPlotSelect = vi.fn();
        render(
            <GardenCanvas
                garden={getInitialGardenState()}
                onPlotSelect={onPlotSelect}
            />
        );
        createGardenGame.mock.calls[0][1](4);
        expect(onPlotSelect).toHaveBeenCalledWith(4);
    });

    it('pushes new gardens to the running game without recreating it', () => {
        const first = getInitialGardenState();
        const second = { ...first, dewDrops: 99 };
        const { rerender } = render(
            <GardenCanvas garden={first} onPlotSelect={vi.fn()} />
        );
        expect(pushGarden).toHaveBeenLastCalledWith(game, first);
        rerender(<GardenCanvas garden={second} onPlotSelect={vi.fn()} />);
        expect(createGardenGame).toHaveBeenCalledTimes(1);
        expect(pushGarden).toHaveBeenLastCalledWith(game, second);
    });

    it('destroys the game on unmount and stops pushing', () => {
        const { unmount } = render(
            <GardenCanvas
                garden={getInitialGardenState()}
                onPlotSelect={vi.fn()}
            />
        );
        unmount();
        expect(game.destroy).toHaveBeenCalledWith(true);
    });
});
