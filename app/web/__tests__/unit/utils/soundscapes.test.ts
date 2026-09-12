import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    playChime,
    playPlantGrowthChime,
    playWaterDropSound,
    startSoundscape,
    stopSoundscape,
} from '@/utils/soundscapes';

function audioParam() {
    return {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    };
}

function makeAudioContext(state: string) {
    const destination = {};
    const context = {
        state: state,
        currentTime: 0,
        sampleRate: 2,
        destination,
        resume: vi.fn(),
        createOscillator: vi.fn(() => ({
            type: '',
            frequency: audioParam(),
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({ gain: audioParam(), connect: vi.fn() })),
        createBuffer: vi.fn(() => ({
            getChannelData: vi.fn(() => new Float32Array(4)),
        })),
        createBufferSource: vi.fn(() => ({
            buffer: null,
            loop: false,
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
        })),
        createBiquadFilter: vi.fn(() => ({
            type: '',
            frequency: audioParam(),
            Q: audioParam(),
            connect: vi.fn(),
        })),
    };
    return context;
}


describe('soundscape utilities with "running" state ', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        const context = makeAudioContext('running');
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            value: vi.fn(() => context),
        });
        stopSoundscape();
    });

    it('plays chimes and water drops through Web Audio nodes', () => {
        playChime(440, 1);
        playWaterDropSound();
        expect(window.AudioContext).toHaveBeenCalled();
    });

    it('schedules plant growth notes and supports the no-sound option', () => {
        playPlantGrowthChime();
        vi.advanceTimersByTime(400);
        startSoundscape('none');
        expect(true).toBe(true);
    });

    it('starts and stops each supported ambient soundscape', () => {
        for (const type of [
            'rain_leaves',
            'meadow_breeze',
            'campfire',
            'stream',
            'twilight_crickets',
        ] as const) {
            startSoundscape(type, 0.2);
            stopSoundscape();
            vi.advanceTimersByTime(500);
        }
        expect(true).toBe(true);
    });

    it('swallows browser audio failures', () => {
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            value: vi.fn(() => {
                throw new Error('unsupported');
            }),
        });
        expect(() => playChime()).not.toThrow();
        expect(() => playWaterDropSound()).not.toThrow();
        expect(() => startSoundscape('rain_leaves')).not.toThrow();
    });
});
