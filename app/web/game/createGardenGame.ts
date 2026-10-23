import Phaser from 'phaser';
import { GardenState } from '@/types';
import { PLANT_SPECIES_CATALOG } from '@/utils/gardenData';

const STAGE_SCALE: Record<string, number> = {
    seed: 0.72,
    sprout: 0.9,
    sapling: 1,
    blooming: 1.18,
    ancient: 1.35,
};

interface TreeSnapshot {
    stage: string;
    plotIndex: number;
    totalWaters: number;
}

class GardenScene extends Phaser.Scene {
    private cells: Phaser.GameObjects.Container[] = [];
    private previous = new Map<string, TreeSnapshot>();

    constructor() {
        super('garden');
    }

    create() {
        this.cameras.main.setBackgroundColor('#f3f7ef');
        this.game.events.on('garden-updated', this.draw, this);
        this.draw();
    }

    private burst(x: number, y: number, color: number) {
        for (let i = 0; i < 8; i += 1) {
            const drop = this.add.circle(x, y, 4, color);
            this.tweens.add({
                targets: drop,
                x: x + Phaser.Math.Between(-36, 36),
                y: y - Phaser.Math.Between(16, 48),
                alpha: 0,
                duration: 500,
                ease: 'Quad.Out',
                onComplete: () => drop.destroy(),
            });
        }
    }

    private draw = () => {
        const garden = this.game.registry.get('garden') as GardenState | null;
        if (!garden) return;
        this.cells.forEach((cell) => cell.destroy());
        this.cells = [];

        const seen = new Set<string>();
        garden.plantedTrees.forEach((tree) => {
            const prior = this.previous.get(tree.id);
            if (prior && tree.totalWaters > prior.totalWaters) {
                const col = tree.plotIndex % 3;
                const row = Math.floor(tree.plotIndex / 3);
                this.burst(70 + col * 136, 80 + row * 136, 0x38bdf8);
            }
            seen.add(tree.id);
        });
        const occupied = new Set(
            garden.plantedTrees.map((tree) => tree.plotIndex)
        );
        this.previous.forEach((prior, id) => {
            if (seen.has(id)) return;
            this.previous.delete(id);
            if (occupied.has(prior.plotIndex)) return;
            const col = prior.plotIndex % 3;
            const row = Math.floor(prior.plotIndex / 3);
            this.burst(70 + col * 136, 80 + row * 136, 0xfbbf24);
        });

        garden.plots.forEach((plot) => {
            const col = plot.index % 3;
            const row = Math.floor(plot.index / 3);
            const x = 70 + col * 136;
            const y = 80 + row * 136;
            const tree = garden.plantedTrees.find(
                (item) => item.plotIndex === plot.index
            );
            const container = this.add.container(x, y);
            const soil = this.add
                .rectangle(
                    0,
                    0,
                    112,
                    112,
                    plot.isUnlocked ? 0xd9f2d4 : 0xe7e5e4
                )
                .setStrokeStyle(3, plot.isUnlocked ? 0x6ea85f : 0xd6d3d1);
            soil.setInteractive({ useHandCursor: true });
            soil.on('pointerdown', () => {
                const onPlot = this.game.registry.get('onPlot') as
                    ((index: number) => void) | undefined;
                onPlot?.(plot.index);
            });
            const info = tree ? PLANT_SPECIES_CATALOG[tree.species] : null;
            const glyph = this.add
                .text(
                    0,
                    -6,
                    info ? info.symbol : plot.isUnlocked ? '+' : '🔒',
                    {
                        fontSize: '40px',
                    }
                )
                .setOrigin(0.5);
            const caption = this.add
                .text(
                    0,
                    40,
                    tree
                        ? tree.stage
                        : plot.isUnlocked
                          ? 'empty'
                          : `${plot.unlockCost} coins`,
                    { fontSize: '12px', color: '#44403c' }
                )
                .setOrigin(0.5);
            container.add([soil, glyph, caption]);
            if (tree) {
                const scale = STAGE_SCALE[tree.stage] ?? 1;
                const prior = this.previous.get(tree.id);
                if (prior && prior.stage !== tree.stage) {
                    glyph.setScale(0.4);
                    this.tweens.add({
                        targets: glyph,
                        scale,
                        duration: 480,
                        ease: 'Back.Out',
                    });
                } else {
                    glyph.setScale(scale);
                }
                this.previous.set(tree.id, {
                    stage: tree.stage,
                    plotIndex: tree.plotIndex,
                    totalWaters: tree.totalWaters,
                });
            }
            this.cells.push(container);
        });
    };
}

export function createGardenGame(
    parent: HTMLElement,
    onPlot: (index: number) => void,
    garden: GardenState
) {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: 480,
        height: 480,
        backgroundColor: '#f3f7ef',
        banner: false,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        callbacks: {
            preBoot: (game) => {
                game.registry.set('garden', garden);
                game.registry.set('onPlot', onPlot);
            },
        },
        scene: GardenScene,
    });
}

export function pushGarden(game: Phaser.Game, garden: GardenState) {
    game.registry.set('garden', garden);
    game.events.emit('garden-updated');
}
