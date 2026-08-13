/**
 * The two noises a key makes either side of the note.
 *
 * **Chiff** is the puff as air first crosses the reed — a short bandpassed
 * burst at four times the fundamental. It matters more than you would expect:
 * without it the attack reads as a click rather than as breath.
 *
 * **Thump** is the key returning and the pallet closing.
 */

import { CHIFF, GAIN_FLOOR, RELEASE } from '../config/audio.ts';

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

const CHIFF_GAIN = dbToGain(CHIFF.levelDb);
const THUMP_GAIN = dbToGain(RELEASE.thumpLevelDb);

/** Both bursts for one voice, fed from the shared noise source. */
export class KeyNoise {
  readonly #chiffFilter: BiquadFilterNode;
  readonly #chiffGain: GainNode;
  readonly #thumpGain: GainNode;

  constructor(ctx: AudioContext, noise: AudioNode, destination: AudioNode) {
    this.#chiffFilter = ctx.createBiquadFilter();
    this.#chiffFilter.type = 'bandpass';
    this.#chiffFilter.Q.value = CHIFF.q;
    this.#chiffFilter.frequency.value = 1000;

    this.#chiffGain = ctx.createGain();
    this.#chiffGain.gain.value = 0;
    noise.connect(this.#chiffFilter).connect(this.#chiffGain).connect(destination);

    const thumpFilter = ctx.createBiquadFilter();
    thumpFilter.type = 'lowpass';
    thumpFilter.frequency.value = RELEASE.thumpCutoffHz;

    this.#thumpGain = ctx.createGain();
    this.#thumpGain.gain.value = 0;
    noise.connect(thumpFilter).connect(this.#thumpGain).connect(destination);
  }

  /** Fire the attack chiff, scaled by how hard the bellows are blowing. */
  chiff(fundamentalHz: number, atTime: number, pressure: number): void {
    const level = CHIFF_GAIN * pressure;
    if (level <= GAIN_FLOOR) return;

    this.#chiffFilter.frequency.setValueAtTime(fundamentalHz * CHIFF.bandpassMultiple, atTime);

    const gain = this.#chiffGain.gain;
    gain.cancelScheduledValues(atTime);
    gain.setValueAtTime(level, atTime);
    gain.exponentialRampToValueAtTime(GAIN_FLOOR, atTime + CHIFF.decayMs / 1000);
    gain.setValueAtTime(0, atTime + CHIFF.decayMs / 1000);
  }

  /** Fire the key-off thump. */
  thump(atTime: number): void {
    const gain = this.#thumpGain.gain;
    gain.cancelScheduledValues(atTime);
    gain.setValueAtTime(THUMP_GAIN, atTime);
    gain.exponentialRampToValueAtTime(GAIN_FLOOR, atTime + RELEASE.thumpMs / 1000);
    gain.setValueAtTime(0, atTime + RELEASE.thumpMs / 1000);
  }
}
