/**
 * Audio-Tactile Engine (Sensory Manipulation & Soundscapes)
 * Provides zero-latency procedural acoustic feedback using Web Audio API synthesis.
 */

// Singleton Web Audio Context
let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Unlocks the Web Audio API context upon user gesture
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    playBrushSound();
    return true;
  } catch (e) {
    console.debug('Failed to unlock audio context', e);
    return false;
  }
}

/**
 * Synthesizes a soft Xuan-paper calligraphy brush sweep
 * Used for major UI modal toggles (Vault, Aperture, Ledger, Ascension)
 */
export function playBrushSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const bufferSize = ctx.sampleRate * 0.15; // 150ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Pink/filtered noise
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
    filter.Q.setValueAtTime(2.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch (e) {
    console.debug('Audio playback suppressed', e);
  }
}

/**
 * Synthesizes a heavy jade primeval stone clink
 * Used for Primeval Stone transactions, extortion, harvests, and shop trades
 */
export function playJadeClinkSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1480, now);
    osc1.frequency.exponentialRampToValueAtTime(740, now + 0.25);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2960, now);
    osc2.frequency.exponentialRampToValueAtTime(1480, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  } catch (e) {
    console.debug('Audio playback suppressed', e);
  }
}

/**
 * Synthesizes an ethereal celestial ascension chime
 */
export function playAscendSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.08, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.8);
    });
  } catch (e) {
    console.debug('Audio playback suppressed', e);
  }
}

export type SoundEffect = 'brush' | 'xuan_paper' | 'jade_clink' | 'ascend';

export function playAudio(sound: SoundEffect): void {
  switch (sound) {
    case 'brush':
    case 'xuan_paper':
      playBrushSound();
      break;
    case 'jade_clink':
      playJadeClinkSound();
      break;
    case 'ascend':
      playAscendSound();
      break;
  }
}

export function useAudio() {
  return {
    playBrush: playBrushSound,
    playJadeClink: playJadeClinkSound,
    playAscend: playAscendSound,
    playAudio
  };
}
