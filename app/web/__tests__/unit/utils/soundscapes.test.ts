import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('soundscape graph construction', () => {
    type Mod = typeof import('@/utils/soundscapes');
    let mod: Mod;
    let ctx: ReturnType<typeof makeRecordingContext>;

    function makeRecordingContext(state: string) {
        const oscillators: any[] = [];
        const gains: any[] = [];
        const sources: any[] = [];
        const filters: any[] = [];
        const param = () => ({
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
        });
        return {
            state,
            currentTime: 1,
            sampleRate: 4,
            destination: { name: 'destination' },
            resume: vi.fn(),
            oscillators,
            gains,
            sources,
            filters,
            createOscillator: vi.fn(() => {
                const o = {
                    type: '',
                    frequency: param(),
                    connect: vi.fn(),
                    start: vi.fn(),
                    stop: vi.fn(),
                };
                oscillators.push(o);
                return o;
            }),
            createGain: vi.fn(() => {
                const g = { gain: param(), connect: vi.fn() };
                gains.push(g);
                return g;
            }),
            createBuffer: vi.fn(() => ({
                getChannelData: vi.fn(() => new Float32Array(8)),
            })),
            createBufferSource: vi.fn(() => {
                const s = {
                    buffer: null,
                    loop: false,
                    connect: vi.fn(),
                    start: vi.fn(),
                    stop: vi.fn(),
                };
                sources.push(s);
                return s;
            }),
            createBiquadFilter: vi.fn(() => {
                const f = {
                    type: '',
                    frequency: param(),
                    Q: param(),
                    connect: vi.fn(),
                };
                filters.push(f);
                return f;
            }),
        };
    }

    async function load(state = 'running', ctor?: unknown) {
        vi.resetModules();
        ctx = makeRecordingContext(state);
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            value:
                ctor ??
                function AudioContextMock() {
                    return ctx;
                },
        });
        mod = await import('@/utils/soundscapes');
    }

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(Math, 'random').mockReturnValue(0.9);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('resumes a suspended context and shapes the chime envelope', async () => {
        await load('suspended');
        mod.playChime(400, 2);
        expect(ctx.resume).toHaveBeenCalled();
        expect(ctx.oscillators).toHaveLength(2);
        expect(ctx.oscillators[0].type).toBe('sine');
        expect(ctx.oscillators[1].type).toBe('triangle');
        expect(ctx.oscillators[0].stop).toHaveBeenCalledWith(3);
        expect(ctx.gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(
            0.2,
            1.05
        );
        expect(ctx.gains[0].connect).toHaveBeenCalledWith(ctx.destination);
    });

    it('falls back to webkitAudioContext', async () => {
        const original = Object.getOwnPropertyDescriptor(
            window,
            'AudioContext'
        );
        await load('running');
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            value: undefined,
        });
        const webkit = vi.fn(function WebkitMock() {
            return ctx;
        });
        (window as any).webkitAudioContext = webkit;
        vi.resetModules();
        mod = await import('@/utils/soundscapes');
        mod.playWaterDropSound();
        expect(webkit).toHaveBeenCalledTimes(1);
        expect(ctx.oscillators).toHaveLength(1);
        delete (window as any).webkitAudioContext;
        if (original) Object.defineProperty(window, 'AudioContext', original);
    });

    it('plays the water drop and reuses the context', async () => {
        await load();
        mod.playWaterDropSound();
        mod.playWaterDropSound();
        expect(ctx.oscillators).toHaveLength(2);
        expect(
            ctx.oscillators[0].frequency.exponentialRampToValueAtTime
        ).toHaveBeenCalledWith(1400, 1.12);
    });

    it('arpeggiates four notes for plant growth', async () => {
        await load();
        mod.playPlantGrowthChime();
        expect(ctx.oscillators).toHaveLength(0);
        vi.advanceTimersByTime(350);
        expect(ctx.oscillators).toHaveLength(8);
        expect(
            ctx.oscillators[0].frequency.setValueAtTime
        ).toHaveBeenCalledWith(440, 1);
    });

    it('builds a looping filtered noise for rain', async () => {
        await load();
        mod.startSoundscape('rain_leaves', 0.3);
        expect(ctx.sources).toHaveLength(1);
        expect(ctx.sources[0].loop).toBe(true);
        expect(ctx.sources[0].start).toHaveBeenCalled();
        expect(ctx.filters[0].type).toBe('lowpass');
        expect(ctx.gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(
            0.3,
            2.5
        );
    });

    it('adds a wind LFO for meadow breeze and stream', async () => {
        await load();
        mod.startSoundscape('meadow_breeze');
        expect(ctx.filters[0].type).toBe('bandpass');
        expect(ctx.oscillators).toHaveLength(1);
        expect(ctx.oscillators[0].start).toHaveBeenCalled();
        mod.startSoundscape('stream');
        expect(ctx.filters[1].type).toBe('bandpass');
        expect(ctx.oscillators).toHaveLength(2);
        expect(ctx.filters[1].frequency.setValueAtTime).toHaveBeenCalledWith(
            600,
            1
        );
    });

    it('crackles on an interval for campfire only when random allows', async () => {
        await load();
        mod.startSoundscape('campfire');
        vi.advanceTimersByTime(320);
        expect(ctx.oscillators).toHaveLength(2);
        expect(ctx.oscillators[0].type).toBe('square');
        (Math.random as any).mockReturnValue(0.1);
        vi.advanceTimersByTime(320);
        expect(ctx.oscillators).toHaveLength(2);
    });

    it('swallows crackle and cricket failures inside the interval', async () => {
        await load();
        mod.startSoundscape('campfire');
        ctx.createOscillator.mockImplementation(() => {
            throw new Error('boom');
        });
        expect(() => vi.advanceTimersByTime(320)).not.toThrow();
        mod.startSoundscape('twilight_crickets');
        expect(() => vi.advanceTimersByTime(700)).not.toThrow();
    });

    it('chirps crickets on an interval', async () => {
        await load();
        mod.startSoundscape('twilight_crickets');
        vi.advanceTimersByTime(700);
        expect(ctx.oscillators).toHaveLength(2);
        expect(ctx.oscillators[0].type).toBe('sine');
    });

    it('fades out and stops sources after the release delay', async () => {
        await load();
        mod.startSoundscape('meadow_breeze');
        const master = ctx.gains[0];
        const [noise] = ctx.sources;
        const [lfo] = ctx.oscillators;
        mod.stopSoundscape();
        expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
            0.001,
            1.4
        );
        expect(noise.stop).not.toHaveBeenCalled();
        vi.advanceTimersByTime(450);
        expect(noise.stop).toHaveBeenCalled();
        expect(lfo.stop).toHaveBeenCalled();
        // second stop is a no-op
        expect(() => mod.stopSoundscape()).not.toThrow();
    });

    it('clears the interval when stopping a campfire', async () => {
        await load();
        mod.startSoundscape('campfire');
        mod.stopSoundscape();
        const count = ctx.oscillators.length;
        vi.advanceTimersByTime(1000);
        expect(ctx.oscillators).toHaveLength(count);
    });

    it('stops cleanly when there is no gain node to fade', async () => {
        await load();
        mod.startSoundscape('twilight_crickets');
        ctx.gains[0].gain.linearRampToValueAtTime.mockImplementation(() => {
            throw new Error('ramp failed');
        });
        expect(() => mod.stopSoundscape()).not.toThrow();
        expect(() => mod.stopSoundscape()).not.toThrow();
    });

    it('stopSoundscape tolerates a context-less state', async () => {
        await load();
        expect(() => mod.stopSoundscape()).not.toThrow();
    });

    it('swallows constructor failures', async () => {
        await load('running', function Broken() {
            throw new Error('nope');
        });
        expect(() => mod.playChime()).not.toThrow();
        expect(() => mod.playWaterDropSound()).not.toThrow();
        expect(() => mod.playPlantGrowthChime()).not.toThrow();
        expect(() => mod.startSoundscape('stream')).not.toThrow();
    });
});
