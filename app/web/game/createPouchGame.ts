import Phaser from 'phaser';
import { PLANT_SPECIES_CATALOG } from '@/utils/gardenData';
import { PlantSpecies } from '@/types';

export function createPouchGame(
    parent: HTMLElement,
    species: PlantSpecies,
    rarity: string
) {
    const info = PLANT_SPECIES_CATALOG[species];

    class PouchScene extends Phaser.Scene {
        constructor() {
            super('pouch');
        }

        create() {
            this.cameras.main.setBackgroundColor('#1c1917');
            const glow = this.add.circle(260, 170, 12, 0xfbbf24, 0.9);
            this.tweens.add({
                targets: glow,
                scale: 8,
                alpha: 0.25,
                duration: 700,
                ease: 'Back.Out',
            });
            const symbol = this.add
                .text(260, 160, info?.symbol ?? '🌱', { fontSize: '72px' })
                .setOrigin(0.5)
                .setAlpha(0)
                .setScale(0.2);
            const name = this.add
                .text(260, 290, info?.name ?? species, {
                    fontSize: '20px',
                    color: '#fafaf9',
                    fontStyle: 'bold',
                    align: 'center',
                    wordWrap: { width: 440 },
                })
                .setOrigin(0.5)
                .setAlpha(0);
            const band = this.add
                .text(260, 340, `${rarity} seed`, {
                    fontSize: '16px',
                    color: '#fbbf24',
                })
                .setOrigin(0.5)
                .setAlpha(0);
            this.tweens.add({
                targets: symbol,
                alpha: 1,
                scale: 1,
                duration: 650,
                ease: 'Back.Out',
            });
            this.tweens.add({
                targets: [name, band],
                alpha: 1,
                delay: 280,
                duration: 400,
            });
        }
    }

    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: 520,
        height: 400,
        backgroundColor: '#1c1917',
        banner: false,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: PouchScene,
    });
}
