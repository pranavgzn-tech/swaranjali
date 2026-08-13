/**
 * The lookahead clock.
 *
 * `setTimeout` is not accurate enough to place a beat, and it stops being
 * called at all when the tab is throttled. So nothing is *played* on a timer:
 * a coarse timer wakes up often, looks a short way into the future, and
 * schedules anything falling inside that window against `AudioContext`'s own
 * clock, which is sample-accurate and keeps running regardless.
 *
 * Doc 03: a 25 ms timer scheduling 100 ms ahead.
 */

const TICK_MS = 25;
const HORIZON_S = 0.1;

/** Called with the audio time to schedule up to. */
export type LookaheadTick = (horizon: number) => void;

export class Lookahead {
  readonly #ctx: AudioContext;
  #timer: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: AudioContext) {
    this.#ctx = ctx;
  }

  get running(): boolean {
    return this.#timer !== null;
  }

  /** The audio clock's current time — the reference for every scheduled event. */
  get now(): number {
    return this.#ctx.currentTime;
  }

  start(tick: LookaheadTick): void {
    if (this.#timer !== null) return;
    // Run once immediately so the first event does not wait for the timer.
    tick(this.#ctx.currentTime + HORIZON_S);
    this.#timer = setInterval(() => tick(this.#ctx.currentTime + HORIZON_S), TICK_MS);
  }

  stop(): void {
    if (this.#timer === null) return;
    clearInterval(this.#timer);
    this.#timer = null;
  }
}
