/**
 * The taal engine: plays a cycle, in time, indefinitely.
 *
 * The whole design rests on one rule — **the beat times are computed from a
 * running total, never accumulated by adding an interval to "now"**. Adding
 * intervals lets each small error compound, and after five minutes the cycle
 * has visibly slid away from where a listener expects it. Counting matras from
 * a fixed origin instead means the error never grows: matra 500 is exactly 500
 * intervals after the origin, however long the app has been running.
 *
 * A tempo change re-origins on the next matra rather than mid-beat, so the
 * beat you are hearing finishes at the tempo it started at.
 */

import { BPM_MAX, BPM_MIN, type Taal } from '../music/taal.ts';
import type { Tabla } from './percussion.ts';
import type { Lookahead } from './scheduler.ts';
import { Signal } from '../state/store.ts';

export interface MatraEvent {
  /** 1-indexed matra within the cycle. */
  matra: number;
  /** When it sounds, on the audio clock. */
  atTime: number;
  isSam: boolean;
  isKhali: boolean;
  isTali: boolean;
  bol: string;
}

export class TaalEngine {
  /** Fires as each matra is *scheduled*, slightly before it sounds. */
  readonly scheduled = new Signal<MatraEvent>();

  readonly #clock: Lookahead;
  readonly #tabla: Tabla;

  #taal: Taal | null = null;
  #bpm = 80;
  #playing = false;

  /** The clock time matra `#originMatra` falls on. */
  #originTime = 0;
  #originMatra = 0;
  /** Total matras counted since the origin, which is what avoids drift. */
  #counter = 0;

  #tapTimes: number[] = [];

  constructor(clock: Lookahead, tabla: Tabla) {
    this.#clock = clock;
    this.#tabla = tabla;
  }

  get playing(): boolean {
    return this.#playing;
  }

  get taal(): Taal | null {
    return this.#taal;
  }

  get bpm(): number {
    return this.#bpm;
  }

  /** Seconds per matra at the current tempo. */
  get matraSeconds(): number {
    return 60 / this.#bpm;
  }

  setTaal(taal: Taal): void {
    this.#taal = taal;
    this.#bpm = taal.defaultBpm;
    this.#reorigin(this.#clock.now);
  }

  /**
   * Change tempo. It takes effect from the next matra, so the current beat
   * finishes at the tempo it began at.
   */
  setBpm(bpm: number): void {
    const next = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
    if (next === this.#bpm) return;
    // Re-origin at the next beat under the *old* tempo, then switch.
    const nextBeat = this.#originTime + (this.#counter + 1) * this.matraSeconds;
    this.#bpm = next;
    this.#originTime = nextBeat;
    this.#originMatra = (this.#originMatra + this.#counter + 1) % (this.#taal?.matras ?? 1);
    this.#counter = -1; // the next scheduled matra is the one at nextBeat
  }

  /** Tap tempo: the average of the last few gaps. */
  tap(): void {
    const now = this.#clock.now;
    // A long pause means a fresh count rather than a very slow tempo.
    if (this.#tapTimes.length > 0 && now - (this.#tapTimes[this.#tapTimes.length - 1] ?? 0) > 2) {
      this.#tapTimes = [];
    }
    this.#tapTimes.push(now);
    if (this.#tapTimes.length > 4) this.#tapTimes.shift();
    if (this.#tapTimes.length < 2) return;

    const first = this.#tapTimes[0] ?? now;
    const last = this.#tapTimes[this.#tapTimes.length - 1] ?? now;
    const gaps = this.#tapTimes.length - 1;
    this.setBpm(60 / ((last - first) / gaps));
  }

  start(): void {
    if (this.#playing || !this.#taal) return;
    this.#playing = true;
    // Start just far enough ahead that the first beat can be scheduled rather
    // than played late.
    this.#reorigin(this.#clock.now + 0.06);
  }

  stop(): void {
    this.#playing = false;
    this.#tabla.silence();
  }

  /** Called from the shared lookahead tick. */
  schedule(horizon: number): void {
    const taal = this.#taal;
    if (!this.#playing || !taal) return;

    while (this.#timeOf(this.#counter + 1) < horizon) {
      this.#counter++;
      const atTime = this.#timeOf(this.#counter);
      const matra = ((this.#originMatra + this.#counter) % taal.matras) + 1;
      const bol = taal.bols[matra - 1] ?? '-';

      this.#tabla.play(bol, atTime, this.matraSeconds);
      this.scheduled.emit({
        matra,
        atTime,
        bol,
        isSam: matra === taal.sam,
        isTali: taal.tali.includes(matra),
        isKhali: taal.khali.includes(matra),
      });
    }
  }

  /** The exact time of a matra, counted from the origin rather than summed. */
  #timeOf(counter: number): number {
    return this.#originTime + counter * this.matraSeconds;
  }

  #reorigin(atTime: number): void {
    this.#originTime = atTime;
    this.#originMatra = 0;
    this.#counter = -1;
  }
}
