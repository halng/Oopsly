export type StudySound =
    'correct' | 'incorrect' | 'flip' | 'tap' | 'match' | 'complete';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        void audioCtx.resume();
    }
    return audioCtx;
}

function tone(
    ctx: AudioContext,
    {
        frequency,
        endFrequency,
        duration,
        type = 'sine',
        gain = 0.12,
        delay = 0,
    }: {
        frequency: number;
        endFrequency?: number;
        duration: number;
        type?: OscillatorType;
        gain?: number;
        delay?: number;
    }
) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const start = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(endFrequency, 1),
            start + duration
        );
    }
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.018);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
}

function playCorrect(ctx: AudioContext) {
    tone(ctx, { frequency: 523.25, duration: 0.12, gain: 0.1 });
    tone(ctx, { frequency: 783.99, duration: 0.22, gain: 0.12, delay: 0.08 });
}

function playIncorrect(ctx: AudioContext) {
    tone(ctx, {
        frequency: 196,
        endFrequency: 130,
        duration: 0.22,
        type: 'triangle',
        gain: 0.08,
    });
}

function playFlip(ctx: AudioContext) {
    tone(ctx, {
        frequency: 420,
        endFrequency: 210,
        duration: 0.14,
        type: 'triangle',
        gain: 0.04,
    });
}

function playTap(ctx: AudioContext) {
    tone(ctx, { frequency: 880, duration: 0.05, gain: 0.045 });
}

function playMatch(ctx: AudioContext) {
    tone(ctx, { frequency: 659.25, duration: 0.1, gain: 0.09 });
    tone(ctx, { frequency: 987.77, duration: 0.18, gain: 0.1, delay: 0.07 });
}

function playComplete(ctx: AudioContext) {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
        tone(ctx, {
            frequency,
            duration: 0.28,
            type: i === 3 ? 'triangle' : 'sine',
            gain: 0.09,
            delay: i * 0.09,
        });
    });
}

export function playStudySound(kind: StudySound) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        switch (kind) {
            case 'correct':
                playCorrect(ctx);
                break;
            case 'incorrect':
                playIncorrect(ctx);
                break;
            case 'flip':
                playFlip(ctx);
                break;
            case 'tap':
                playTap(ctx);
                break;
            case 'match':
                playMatch(ctx);
                break;
            case 'complete':
                playComplete(ctx);
                break;
        }
    } catch {
        // Browsers may block Web Audio before a user gesture.
    }
}
