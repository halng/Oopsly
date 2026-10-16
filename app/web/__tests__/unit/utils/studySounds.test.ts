import { beforeEach, describe, expect, it, vi } from 'vitest';

function audioParam() {
    return {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    };
}

function makeAudioContext(state: string) {
    return {
        state,
        currentTime: 0,
        destination: {},
        resume: vi.fn(),
        createOscillator: vi.fn(() => ({
            type: '',
            frequency: audioParam(),
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({ gain: audioParam(), connect: vi.fn() })),
    };
}

function installAudioContext(
    context: ReturnType<typeof makeAudioContext>,
    key: 'AudioContext' | 'webkitAudioContext' = 'AudioContext'
) {
    const Ctor = function AudioContextMock() {
        return context;
    };
    Object.defineProperty(window, key, {
        configurable: true,
        writable: true,
        value: Ctor,
    });
    if (key === 'webkitAudioContext') {
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            writable: true,
            value: undefined,
        });
    }
    return Ctor;
}

describe('studySounds', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('plays every study sound through Web Audio nodes', async () => {
        const context = makeAudioContext('running');
        installAudioContext(context);
        const { playStudySound } = await import('@/utils/studySounds');
        for (const kind of [
            'correct',
            'incorrect',
            'flip',
            'tap',
            'match',
            'complete',
        ] as const) {
            playStudySound(kind);
        }
        expect(context.createOscillator).toHaveBeenCalled();
        expect(context.createGain).toHaveBeenCalled();
    });

    it('resumes a suspended audio context', async () => {
        const context = makeAudioContext('suspended');
        installAudioContext(context);
        const { playStudySound } = await import('@/utils/studySounds');
        playStudySound('tap');
        expect(context.resume).toHaveBeenCalled();
    });

    it('falls back to webkitAudioContext', async () => {
        const context = makeAudioContext('running');
        installAudioContext(context, 'webkitAudioContext');
        const { playStudySound } = await import('@/utils/studySounds');
        playStudySound('match');
        expect(context.createOscillator).toHaveBeenCalled();
    });

    it('swallows missing AudioContext and constructor failures', async () => {
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            writable: true,
            value: undefined,
        });
        Object.defineProperty(window, 'webkitAudioContext', {
            configurable: true,
            writable: true,
            value: undefined,
        });
        const { playStudySound } = await import('@/utils/studySounds');
        expect(() => playStudySound('correct')).not.toThrow();

        vi.resetModules();
        Object.defineProperty(window, 'AudioContext', {
            configurable: true,
            writable: true,
            value: function BrokenAudioContext() {
                throw new Error('unsupported');
            },
        });
        const sounds = await import('@/utils/studySounds');
        expect(() => sounds.playStudySound('complete')).not.toThrow();
    });
});
