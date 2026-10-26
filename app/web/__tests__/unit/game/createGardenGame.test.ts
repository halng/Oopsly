import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GardenState } from '@/types';
import { getInitialGardenState } from '@/utils/gardenData';
import { FakeGame } from './phaserFake';

vi.mock('phaser', async () => {
    const { phaserFake } = await import('./phaserFake');
    return { default: phaserFake };
});

import { createGardenGame, pushGarden } from '@/game/createGardenGame';

function textOf(game: FakeGame, kind = 'text') {
    return game.scene.objects
        .filter((o: any) => o.kind === kind && !o.destroyed)
        .map((o: any) => o.args[2]);
}

function create(garden: GardenState = getInitialGardenState()) {
    const onPlot = vi.fn();
    const parent = document.createElement('div');
    const game = createGardenGame(
        parent,
        onPlot,
        garden
    ) as unknown as FakeGame;
    return { game, onPlot, parent, garden };
}

describe('createGardenGame', () => {
    beforeEach(() => {
        FakeGame.instances.length = 0;
    });

    it('configures a fitted game and seeds the registry before boot', () => {
        const { game, onPlot, parent, garden } = create();
        expect(game.config).toMatchObject({
            parent,
            width: 480,
            height: 480,
            banner: false,
            type: 'AUTO',
            scale: { mode: 'FIT', autoCenter: 'CENTER_BOTH' },
        });
        expect(game.registry.get('garden')).toBe(garden);
        expect(game.registry.get('onPlot')).toBe(onPlot);
        expect(game.scene.key).toBe('garden');
        expect(game.scene.bg).toBe('#f3f7ef');
    });

    it('draws one cell per plot with the right glyph and caption', () => {
        const { game, garden } = create();
        const containers = game.scene.objects.filter(
            (o: any) => o.kind === 'container'
        );
        expect(containers).toHaveLength(garden.plots.length);
        // plot 5 holds the starter camphor tree in sprout stage
        const captions = textOf(game);
        expect(captions).toContain('sprout');
        expect(captions).toContain('empty');
        expect(captions.some((c: string) => c.endsWith(' coins'))).toBe(true);
        expect(captions).toContain('🔒');
        expect(captions).toContain('+');
        // sprout scale
        const glyph = game.scene.objects.find(
            (o: any) =>
                o.kind === 'text' && o.args[2] !== '+' && o.scale === 0.9
        );
        expect(glyph).toBeDefined();
    });

    it('positions plots on a three column grid', () => {
        const { game } = create();
        const containers = game.scene.objects.filter(
            (o: any) => o.kind === 'container'
        );
        expect(containers[0].args.slice(0, 2)).toEqual([70, 80]);
        expect(containers[4].args.slice(0, 2)).toEqual([206, 216]);
    });

    it('colours locked and unlocked plots differently', () => {
        const { game, garden } = create();
        const soils = game.scene.objects.filter(
            (o: any) => o.kind === 'rectangle'
        );
        garden.plots.forEach((plot, i) => {
            expect(soils[i].args[4]).toBe(
                plot.isUnlocked ? 0xd9f2d4 : 0xe7e5e4
            );
            expect(soils[i].stroke[1]).toBe(
                plot.isUnlocked ? 0x6ea85f : 0xd6d3d1
            );
            expect(soils[i].interactive).toEqual({ useHandCursor: true });
        });
    });

    it('reports a clicked plot through the registered callback', () => {
        const { game, onPlot } = create();
        const soils = game.scene.objects.filter(
            (o: any) => o.kind === 'rectangle'
        );
        soils[7].handlers.pointerdown();
        expect(onPlot).toHaveBeenCalledWith(7);
    });

    it('ignores clicks when no callback is registered', () => {
        const { game } = create();
        game.registry.delete('onPlot');
        const soil = game.scene.objects.find(
            (o: any) => o.kind === 'rectangle'
        );
        expect(() => soil.handlers.pointerdown()).not.toThrow();
    });

    it('does nothing when the registry has no garden', () => {
        const { game } = create();
        const before = game.scene.objects.length;
        game.registry.set('garden', null);
        game.events.emit('garden-updated');
        expect(game.scene.objects).toHaveLength(before);
    });

    it('destroys old cells and redraws on pushGarden', () => {
        const { game, garden } = create();
        const firstContainers = game.scene.objects.filter(
            (o: any) => o.kind === 'container'
        );
        pushGarden(game as any, { ...garden, plantedTrees: [] });
        expect(firstContainers.every((c: any) => c.destroyed)).toBe(true);
        expect(textOf(game)).not.toContain('sprout');
        expect(game.registry.get('garden')).not.toBe(garden);
    });

    it('bursts blue droplets when a tree is watered', () => {
        const { game, garden } = create();
        const tree = garden.plantedTrees[0];
        pushGarden(game as any, {
            ...garden,
            plantedTrees: [{ ...tree, totalWaters: tree.totalWaters + 1 }],
        });
        const drops = game.scene.objects.filter(
            (o: any) => o.kind === 'circle'
        );
        expect(drops).toHaveLength(8);
        expect(drops[0].args).toEqual([342, 216, 4, 0x38bdf8]);
        const burst = game.scene.tweens.added.filter(
            (t: any) => t.config.duration === 500
        );
        expect(burst).toHaveLength(8);
        expect(burst[0].config).toMatchObject({ alpha: 0, x: 342, y: 184 });
        burst[0].config.onComplete();
        expect(drops[0].destroyed).toBe(true);
    });

    it('bursts gold when a tree is gathered and its plot is empty', () => {
        const { game, garden } = create();
        pushGarden(game as any, { ...garden, plantedTrees: [] });
        const drops = game.scene.objects.filter(
            (o: any) => o.kind === 'circle'
        );
        expect(drops).toHaveLength(8);
        expect(drops[0].args[3]).toBe(0xfbbf24);
    });

    it('does not burst when the plot is reoccupied by another tree', () => {
        const { game, garden } = create();
        const tree = garden.plantedTrees[0];
        pushGarden(game as any, {
            ...garden,
            plantedTrees: [{ ...tree, id: 'replacement' }],
        });
        expect(
            game.scene.objects.filter((o: any) => o.kind === 'circle')
        ).toHaveLength(0);
    });

    it('pops the glyph with a tween when the stage changes', () => {
        const { game, garden } = create();
        const tree = garden.plantedTrees[0];
        pushGarden(game as any, {
            ...garden,
            plantedTrees: [{ ...tree, stage: 'blooming' }],
        });
        const growth = game.scene.tweens.added.find(
            (t: any) => t.config.duration === 480
        );
        expect(growth.config).toMatchObject({ scale: 1.18, ease: 'Back.Out' });
        expect(growth.config.targets.scale).toBe(0.4);
    });

    it('falls back to scale 1 for an unknown stage', () => {
        const garden = getInitialGardenState();
        garden.plantedTrees[0].stage = 'mystery' as any;
        const { game } = create(garden);
        const glyph = game.scene.objects.find(
            (o: any) => o.kind === 'text' && o.args[2] === 'mystery'
        );
        expect(glyph).toBeDefined();
        const symbols = game.scene.objects.filter(
            (o: any) => o.kind === 'text' && o.args[3].fontSize === '40px'
        );
        expect(symbols.some((o: any) => o.scale === 1)).toBe(true);
    });
});
