'use client';

import React, { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { PlantSpecies } from '@/types';
import { PLANT_SPECIES_CATALOG } from '@/utils/gardenData';
import { createPouchGame } from '@/game/createPouchGame';

interface PouchRevealProps {
    species: PlantSpecies;
    rarity: string;
}

export default function PouchReveal({ species, rarity }: PouchRevealProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const info = PLANT_SPECIES_CATALOG[species];

    useEffect(() => {
        if (!parentRef.current) return;
        const game: Phaser.Game = createPouchGame(
            parentRef.current,
            species,
            rarity
        );
        return () => {
            game.destroy(true);
        };
    }, [rarity, species]);

    return (
        <div data-testid="seed-pouch" className="space-y-2">
            <div
                ref={parentRef}
                className="mx-auto h-[280px] w-full max-w-[520px] overflow-hidden rounded-3xl"
            />
            <p className="text-center text-xs text-stone-500">
                {info?.name ?? species} added to your seeds.
            </p>
        </div>
    );
}
