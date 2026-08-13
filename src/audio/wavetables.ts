/**
 * PeriodicWave construction from the harmonic tables in doc 03.
 *
 * The phases are pseudo-random from a fixed seed rather than all zero. With
 * every harmonic in phase the waveform is a tall spike, which peaks the
 * limiter and sounds buzzy in the wrong way; scattered phases give the same
 * spectrum with a much lower crest factor. The seed keeps it reproducible, so
 * two builds sound identical.
 */

import { BANK_IDS, HARMONICS, WAVETABLE_PHASE_SEED, type BankId } from '../config/audio.ts';
import { seededRandom } from './random.ts';

function buildWave(ctx: BaseAudioContext, amplitudes: readonly number[], random: () => number): PeriodicWave {
  // Index 0 is the DC term and is always zero: a free reed has no offset.
  const real = new Float32Array(amplitudes.length + 1);
  const imag = new Float32Array(amplitudes.length + 1);

  for (let harmonic = 1; harmonic <= amplitudes.length; harmonic++) {
    const amplitude = amplitudes[harmonic - 1] ?? 0;
    const phase = random() * Math.PI * 2;
    real[harmonic] = amplitude * Math.sin(phase);
    imag[harmonic] = amplitude * Math.cos(phase);
  }

  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

export type ReedWaves = Readonly<Record<BankId, PeriodicWave>>;

/**
 * Build one wave per reed bank. Called once during "Tap to begin", never
 * during play.
 */
export function buildReedWaves(ctx: BaseAudioContext): ReedWaves {
  // One generator shared across banks, so each bank gets a different scatter
  // but the whole set is still determined by the single seed.
  const random = seededRandom(WAVETABLE_PHASE_SEED);
  const waves = {} as Record<BankId, PeriodicWave>;
  for (const bank of BANK_IDS) {
    waves[bank] = buildWave(ctx, HARMONICS[bank], random);
  }
  return waves;
}
