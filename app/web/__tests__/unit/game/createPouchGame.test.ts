import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLANT_SPECIES_CATALOG } from '@/utils/gardenData';
import { FakeGame } from './phaserFake';

vi.mock('phaser', async () => {
    const { phaserFake } = await import('./phaserFake');
    return { default: phaserFake };
});

import { createPouchGame } from '@/game/createPouchGame';

describe('createPouchGame', () => {
    beforeEach(() => {
        FakeGame.instances.length = 0;
    });

    it('configures a fitted dark game', () => {
        const parent = document.createElement('div');
        const game = createPouchGame(
            parent,
            'camphor_tree',
            'Rare'
        ) as unknown as FakeGame;
        expect(game.config).toMatchObject({
            parent,
            width: 520,
            height: 400,
            backgroundColor: '#1c1917',
            banner: false,
            scale: { mode: 'FIT', autoCenter: 'CENTER_BOTH' },
        });
        expect(game.scene.key).toBe('pouch');
        expect(game.scene.bg).toBe('#1c1917');
    });

    it('reveals the species symbol, name and rarity', () => {
        const info = PLANT_SPECIES_CATALOG.camphor_tree;
        const game = createPouchGame(
            document.createElement('div'),
            'camphor_tree',
            'Rare'
        ) as unknown as FakeGame;
        const texts = game.scene.objects.filter((o: any) => o.kind === 'text');
        expect(texts.map((t: any) => t.args[2])).toEqual([
            info.symbol,
            info.name,
            'Rare seed',
        ]);
        expect(texts.every((t: any) => t.alpha === 0)).toBe(true);
        expect(texts[0].scale).toBe(0.2);
        const [glowTween, symbolTween, labelTween] = game.scene.tweens.added;
        expect(glowTween.config).toMatchObject({ scale: 8, alpha: 0.25 });
        expect(symbolTween.config).toMatchObject({
            targets: texts[0],
            alpha: 1,
            scale: 1,
        });
        expect(labelTween.config.targets).toEqual([texts[1], texts[2]]);
        expect(labelTween.config.delay).toBe(280);
    });

    it('falls back to a sprout and the raw species for unknown seeds', () => {
        const game = createPouchGame(
            document.createElement('div'),
            'mystery_seed' as any,
            'Common'
        ) as unknown as FakeGame;
        const texts = game.scene.objects
            .filter((o: any) => o.kind === 'text')
            .map((t: any) => t.args[2]);
        expect(texts.slice(0, 2)).toEqual(['🌱', 'mystery_seed']);
    });
});
