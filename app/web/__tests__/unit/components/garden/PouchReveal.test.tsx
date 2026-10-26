import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PLANT_SPECIES_CATALOG } from '@/utils/gardenData';

const destroy = vi.fn();
const createPouchGame = vi.fn((..._args: any[]) => ({ destroy }));

vi.mock('@/game/createPouchGame', () => ({
    createPouchGame: (...args: any[]) => createPouchGame(...args),
}));

import PouchReveal from '@/components/garden/PouchReveal';

describe('PouchReveal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts the reveal game and shows the species caption', () => {
        const { container } = render(
            <PouchReveal species="camphor_tree" rarity="Rare" />
        );
        expect(screen.getByTestId('seed-pouch')).toBeInTheDocument();
        expect(
            screen.getByText(
                `${PLANT_SPECIES_CATALOG.camphor_tree.name} added to your seeds.`
            )
        ).toBeInTheDocument();
        expect(createPouchGame).toHaveBeenCalledWith(
            container.querySelector('.mx-auto'),
            'camphor_tree',
            'Rare'
        );
    });

    it('restarts the game when the seed changes and cleans up on unmount', () => {
        const { rerender, unmount } = render(
            <PouchReveal species="camphor_tree" rarity="Rare" />
        );
        rerender(<PouchReveal species="cherry_blossom" rarity="Common" />);
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(createPouchGame).toHaveBeenCalledTimes(2);
        expect(createPouchGame.mock.calls[1].slice(1)).toEqual([
            'cherry_blossom',
            'Common',
        ]);
        unmount();
        expect(destroy).toHaveBeenCalledWith(true);
        expect(destroy).toHaveBeenCalledTimes(2);
    });

    it('falls back to the raw species name when the catalog lacks it', () => {
        render(<PouchReveal species={'mystery' as any} rarity="Common" />);
        expect(
            screen.getByText('mystery added to your seeds.')
        ).toBeInTheDocument();
    });
});
