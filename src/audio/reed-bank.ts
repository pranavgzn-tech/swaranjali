/**
 * One reed bank of one voice: a detuned pair or trio of oscillators, a lowpass
 * that follows air pressure, and the gain that makes it speak.
 *
 * The oscillators run from boot and are never created or destroyed. A note-on
 * retunes them and ramps the gain up; a note-off ramps it down.
 */

import {
  ATTACK,
  BANK_SEMITONES,
  DRIFT,
  GAIN_FLOOR,
  OSC_DETUNE_CENTS,
  PRESSURE,
  RELEASE,
  type BankId,
} from '../config/audio.ts';
import type { ToneSource } from './tone-source.ts';

export interface ReedBankOptions {
  bank: BankId;
  wave: PeriodicWave;
  oscCount: number;
  /** Shared 0…1 pressure signal, scaled per bank into the filter cutoff. */
  cutoffSignal: AudioNode;
  /** Shared cents offset that sharpens every reed under hard pumping. */
  pitchCentsSignal: AudioNode;
  destination: AudioNode;
  random: () => number;
  /** Extra semitones on top of the bank's own octave, for the coupler. */
  semitoneOffset?: number;
  /** Added to the bank's attack time. The coupler speaks slightly later. */
  attackExtraMs?: number;
  /** Peak gain the attack ramps to. The coupler sits below the main voice. */
  peak?: number;
}

export class SynthReedSource implements ToneSource {
  readonly #ctx: AudioContext;
  readonly #bank: BankId;
  readonly #oscillators: OscillatorNode[] = [];
  readonly #filter: BiquadFilterNode;
  readonly #gain: GainNode;
  readonly #ratio: number;
  readonly #attackExtraMs: number;
  readonly #peak: number;
  #pressure = 0;

  constructor(ctx: AudioContext, options: ReedBankOptions) {
    this.#ctx = ctx;
    this.#bank = options.bank;
    this.#ratio = Math.pow(2, (BANK_SEMITONES[options.bank] + (options.semitoneOffset ?? 0)) / 12);
    this.#attackExtraMs = options.attackExtraMs ?? 0;
    this.#peak = options.peak ?? 1;

    this.#filter = ctx.createBiquadFilter();
    this.#filter.type = 'lowpass';
    this.#filter.Q.value = 0.7;
    // The cutoff's resting value is the base; the shared pressure signal adds
    // the rest, so no per-voice writes happen while playing.
    this.#filter.frequency.value = PRESSURE.cutoffHz[options.bank].base;
    options.cutoffSignal.connect(this.#filter.frequency);

    this.#gain = ctx.createGain();
    this.#gain.gain.value = 0;

    this.#filter.connect(this.#gain);
    this.#gain.connect(options.destination);

    for (let i = 0; i < options.oscCount; i++) {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(options.wave);
      osc.detune.value = OSC_DETUNE_CENTS[i] ?? 0;
      osc.connect(this.#filter);
      options.pitchCentsSignal.connect(osc.detune);

      // An independent slow drift per oscillator. Without it two notes of the
      // same pitch sound identical, which is what makes a synth sound synthetic.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = DRIFT.rateMinHz + options.random() * (DRIFT.rateMaxHz - DRIFT.rateMinHz);
      const depth = ctx.createGain();
      depth.gain.value = DRIFT.depthCents;
      lfo.connect(depth).connect(osc.detune);
      lfo.start();

      osc.start();
      this.#oscillators.push(osc);
    }
  }

  setPressure(pressure: number): void {
    this.#pressure = pressure;
  }

  /** Air pressure at the last update — the chiff is scaled by it. */
  get pressure(): number {
    return this.#pressure;
  }

  noteOn(freqHz: number, atTime: number): void {
    const attack = ATTACK[this.#bank];
    const frequency = freqHz * this.#ratio;

    for (let i = 0; i < this.#oscillators.length; i++) {
      const osc = this.#oscillators[i];
      if (!osc) continue;
      osc.frequency.setValueAtTime(frequency, atTime);

      // A free reed starts slightly flat and settles. The scoop rides on top
      // of this oscillator's fixed detune.
      const base = OSC_DETUNE_CENTS[i] ?? 0;
      osc.detune.cancelScheduledValues(atTime);
      osc.detune.setValueAtTime(base + attack.scoopCents, atTime);
      osc.detune.linearRampToValueAtTime(base, atTime + attack.scoopMs / 1000);
    }

    const gain = this.#gain.gain;
    gain.cancelScheduledValues(atTime);
    gain.setValueAtTime(Math.max(gain.value, GAIN_FLOOR), atTime);
    gain.exponentialRampToValueAtTime(this.#peak, atTime + (attack.gainMs + this.#attackExtraMs) / 1000);
  }

  /**
   * Change pitch without re-articulating. A drone that is already sounding
   * follows a change of Sa; it does not start again, and it does not scoop —
   * doc 03 gives the scoop to the first onset only.
   */
  retune(freqHz: number, atTime: number): void {
    const frequency = freqHz * this.#ratio;
    for (const osc of this.#oscillators) {
      osc.frequency.setTargetAtTime(frequency, atTime, 0.02);
    }
  }

  /** True while this source is speaking, so the bellows can count it. */
  get sounding(): boolean {
    return this.#gain.gain.value > GAIN_FLOOR;
  }

  noteOff(atTime: number): void {
    const gain = this.#gain.gain;
    const release = atTime + RELEASE.gainMs / 1000;
    gain.cancelScheduledValues(atTime);
    gain.setValueAtTime(Math.max(gain.value, GAIN_FLOOR), atTime);
    gain.exponentialRampToValueAtTime(GAIN_FLOOR, release);
    // Exponential ramps never reach zero, so land it properly afterwards.
    gain.setValueAtTime(0, release);
  }

  /** Silence immediately, for panic release after an interruption. */
  silence(): void {
    const gain = this.#gain.gain;
    gain.cancelScheduledValues(this.#ctx.currentTime);
    gain.setValueAtTime(0, this.#ctx.currentTime);
  }
}
