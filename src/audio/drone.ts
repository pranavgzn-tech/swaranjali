/**
 * The three drone stops: Sa in the low octave, Sa in the middle, and Pa or Ma.
 *
 * These are sustained harmonium reeds, not a separate synth — same wavetables,
 * same filters, same attack. They also **draw air from the reservoir like any
 * other note**, which is what a real instrument does and is worth knowing
 * before you wonder why the reservoir empties faster with the drone up.
 *
 * Ragas that leave out Pa — Marwa, Puriya — drone on shuddh Ma instead, which
 * is what the toggle under the third fader is for.
 */

import type { BankId, FaderId } from '../config/audio.ts';
import { frequencyOf } from '../music/pitch.ts';
import { madhyaSa } from '../music/pitch.ts';
import { SynthReedSource } from './reed-bank.ts';
import type { ReedWaves } from './wavetables.ts';

export type DroneId = 'droneSaMandra' | 'droneSaMadhya' | 'dronePaMa';
export type DroneNote = 'pa' | 'ma';

export const DRONE_IDS: readonly DroneId[] = ['droneSaMandra', 'droneSaMadhya', 'dronePaMa'] as const;

/** Semitones from madhya Sa. Pa is a fifth above Sa, shuddh Ma a fourth. */
const OFFSETS = { droneSaMandra: -12, droneSaMadhya: 0, pa: 7, ma: 5 } as const;

/** Below this a stop counts as off, and stops speaking. */
const OFF_THRESHOLD = 0.001;

interface Stop {
  source: SynthReedSource;
  level: GainNode;
  sounding: boolean;
}

export interface DroneOptions {
  waves: ReedWaves;
  oscCount: number;
  cutoffSignals: Record<BankId, AudioNode>;
  pitchCentsSignal: AudioNode;
  /** The instrument bus: drone reeds are coloured by the body like any reed. */
  destination: AudioNode;
  random: () => number;
}

export class Drone {
  readonly #ctx: AudioContext;
  readonly #stops: Record<DroneId, Stop>;
  #sa = 0;
  #referenceA4 = 440;
  #note: DroneNote = 'pa';

  constructor(ctx: AudioContext, options: DroneOptions) {
    this.#ctx = ctx;

    const build = (): Stop => {
      const level = ctx.createGain();
      level.gain.value = 0;
      level.connect(options.destination);
      const source = new SynthReedSource(ctx, {
        // The male 8′ bank is the drone reed: the low stop is voiced down an
        // octave by its own offset rather than by using the bass bank, so the
        // two Sa stops share a timbre.
        bank: 'male',
        wave: options.waves.male,
        oscCount: options.oscCount,
        cutoffSignal: options.cutoffSignals.male,
        pitchCentsSignal: options.pitchCentsSignal,
        destination: level,
        random: options.random,
      });
      return { source, level, sounding: false };
    };

    this.#stops = {
      droneSaMandra: build(),
      droneSaMadhya: build(),
      dronePaMa: build(),
    };
  }

  /** How many drone reeds are speaking, for the bellows to charge air for. */
  get activeCount(): number {
    let count = 0;
    for (const id of DRONE_IDS) if (this.#stops[id].sounding) count++;
    return count;
  }

  setPressure(pressure: number): void {
    for (const id of DRONE_IDS) this.#stops[id].source.setPressure(pressure);
  }

  /** Sa moved, or the reference pitch changed. Sounding stops follow along. */
  setTuning(saPitchClass: number, referenceA4: number): void {
    this.#sa = saPitchClass;
    this.#referenceA4 = referenceA4;
    const now = this.#ctx.currentTime;
    for (const id of DRONE_IDS) {
      const stop = this.#stops[id];
      if (stop.sounding) stop.source.retune(this.#frequency(id), now);
    }
  }

  /** Pa for most ragas, shuddh Ma for the ones that omit Pa. */
  setNote(note: DroneNote): void {
    if (note === this.#note) return;
    this.#note = note;
    const stop = this.#stops.dronePaMa;
    if (stop.sounding) stop.source.retune(this.#frequency('dronePaMa'), this.#ctx.currentTime);
  }

  get note(): DroneNote {
    return this.#note;
  }

  /**
   * Fader level, already through the loudness curve. Raising a stop from
   * silence starts the reed; dropping it to zero stops it.
   */
  setLevel(id: FaderId, value: number): void {
    if (!DRONE_IDS.includes(id as DroneId)) return;
    const stop = this.#stops[id as DroneId];
    const now = this.#ctx.currentTime;

    stop.level.gain.setTargetAtTime(value, now, 0.02);

    if (value > OFF_THRESHOLD && !stop.sounding) {
      stop.sounding = true;
      stop.source.noteOn(this.#frequency(id as DroneId), now);
    } else if (value <= OFF_THRESHOLD && stop.sounding) {
      stop.sounding = false;
      stop.source.noteOff(now);
    }
  }

  /** Silence every drone — panic, and interruptions. */
  silenceAll(): void {
    for (const id of DRONE_IDS) {
      this.#stops[id].sounding = false;
      this.#stops[id].source.silence();
    }
  }

  #frequency(id: DroneId): number {
    const offset = id === 'dronePaMa' ? OFFSETS[this.#note] : OFFSETS[id];
    return frequencyOf(madhyaSa(this.#sa) + offset, 0, this.#referenceA4);
  }
}
