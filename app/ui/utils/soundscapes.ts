import { SoundscapeType } from '../types';

let audioCtx: AudioContext | null = null;
let currentNodes: {
  gainNode?: GainNode;
  sources?: (AudioNode | number)[];
  intervalId?: any;
} | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a soothing Ghibli temple singing bowl / meditation chime
 */
export function playChime(frequency = 528, duration = 2.5) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);
    osc1.frequency.exponentialRampToValueAtTime(frequency * 0.99, now + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 2.01, now);
    osc2.frequency.exponentialRampToValueAtTime(frequency * 2, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (err) {
    // Web audio might be restricted before interaction
  }
}

/**
 * Plays gentle water droplet sound for watering trees
 */
export function playWaterDropSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch (err) {}
}

/**
 * Plays celebratory tree planting / level-up chime
 */
export function playPlantGrowthChime() {
  try {
    const ctx = getAudioContext();
    const notes = [440, 554.37, 659.25, 880]; // A Major arpeggio
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playChime(freq, 1.2);
      }, idx * 100);
    });
  } catch (err) {}
}

/**
 * Starts ambient nature soundscapes using procedural synthesis
 */
export function startSoundscape(type: SoundscapeType, volume = 0.18) {
  stopSoundscape();
  if (type === 'none') return;

  try {
    const ctx = getAudioContext();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
    masterGain.connect(ctx.destination);

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    if (type === 'rain_leaves') {
      // Rain generator: Pink noise filtered + random high drips
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();

      currentNodes = { gainNode: masterGain, sources: [whiteNoise] };
    } else if (type === 'meadow_breeze') {
      // Meadow Breeze: Modulated lowpass noise with sweeping cut-off
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);

      // LFO for swaying wind
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(150, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();

      currentNodes = { gainNode: masterGain, sources: [whiteNoise, lfo] };
    } else if (type === 'campfire') {
      // Campfire: Brown noise with randomized crackles
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();

      // Random crackle pulses
      const intervalId = setInterval(() => {
        if (Math.random() > 0.4) {
          try {
            const crackleOsc = ctx.createOscillator();
            const crackleGain = ctx.createGain();
            crackleOsc.type = 'square';
            crackleOsc.frequency.setValueAtTime(100 + Math.random() * 800, ctx.currentTime);
            crackleGain.gain.setValueAtTime(0.04, ctx.currentTime);
            crackleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
            crackleOsc.connect(crackleGain);
            crackleGain.connect(masterGain);
            crackleOsc.start();
            crackleOsc.stop(ctx.currentTime + 0.05);
          } catch (e) {}
        }
      }, 160);

      currentNodes = { gainNode: masterGain, sources: [whiteNoise], intervalId };
    } else if (type === 'stream') {
      // Mountain stream: dynamic bubbling water
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(600, ctx.currentTime);
      filter1.Q.setValueAtTime(3.0, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.8, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter1.frequency);
      lfo.start();

      whiteNoise.connect(filter1);
      filter1.connect(masterGain);
      whiteNoise.start();

      currentNodes = { gainNode: masterGain, sources: [whiteNoise, lfo] };
    } else if (type === 'twilight_crickets') {
      // Soft background noise + rhythm crickets
      const intervalId = setInterval(() => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(4500 + Math.random() * 200, ctx.currentTime);
          gain.gain.setValueAtTime(0.02, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        } catch (e) {}
      }, 350);

      currentNodes = { gainNode: masterGain, intervalId };
    }
  } catch (err) {
    // Audio Context failed
  }
}

export function stopSoundscape() {
  if (currentNodes) {
    if (currentNodes.intervalId) {
      clearInterval(currentNodes.intervalId);
    }
    if (currentNodes.gainNode && audioCtx) {
      try {
        currentNodes.gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        setTimeout(() => {
          if (currentNodes?.sources) {
            currentNodes.sources.forEach((s) => {
              if (typeof s === 'object' && 'stop' in s) {
                (s as any).stop?.();
              }
            });
          }
          currentNodes = null;
        }, 450);
      } catch (e) {
        currentNodes = null;
      }
    } else {
      currentNodes = null;
    }
  }
}
