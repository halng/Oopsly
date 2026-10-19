'use client';

import React, { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { GardenState } from '@/types';
import { createGardenGame, pushGarden } from '@/game/createGardenGame';

interface GardenCanvasProps {
    garden: GardenState;
    onPlotSelect: (plotIndex: number) => void;
}

export default function GardenCanvas({
    garden,
    onPlotSelect,
}: GardenCanvasProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const onPlotRef = useRef(onPlotSelect);
    onPlotRef.current = onPlotSelect;

    useEffect(() => {
        if (!parentRef.current) return;
        const game = createGardenGame(
            parentRef.current,
            (index) => onPlotRef.current(index),
            garden
        );
        gameRef.current = game;
        return () => {
            game.destroy(true);
            gameRef.current = null;
        };
        // The scene is created once and receives later gardens through pushGarden.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (gameRef.current) pushGarden(gameRef.current, garden);
    }, [garden]);

    return (
        <div
            ref={parentRef}
            data-testid="garden-canvas"
            className="mx-auto h-[420px] w-full max-w-[520px] overflow-hidden rounded-3xl"
        />
    );
}
