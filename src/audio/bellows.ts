/**
 * The air reservoir.
 *
 * A real harmonium makes no sound unless you are pumping, and if you stop, it
 * dies. That is modelled honestly here rather than faked, because free sustain
 * would teach a reflex that has to be unlearned on a real instrument.
 *
 * Runs at frame rate from one `requestAnimationFrame` loop and must stay well
 * under a millisecond. It writes four audio parameters per frame, no matter
 * how many voices are sounding, by driving shared signals rather than each
 * voice's nodes.
 */

import { BELLOWS, PRESSURE, PUMP_TRAVEL_RATE, type BankId } from '../config/audio.ts';
import { Signal } from '../state/store.ts';

/** The sum of the bank weights, used to normalise the air draw. */
const BANK_WEIGHT_TOTAL = BELLOWS.bankDraw.bass + BELLOWS.bankDraw.male + BELLOWS.bankDraw.female;

export interface BellowsInputs {
  /** How many notes are currently sounding. */
  soundingNotes(): number;
  /** Fader level 0…1 for a reed bank. */
  bankLevel(bank: BankId): number;
  assistMode(): boolean;
}

export class Bellows {
  /** Current air pressure, 0…1. */
  pressure = 0;

  /** Fires once per frame with the current pressure, for the reservoir light. */
  readonly onFrame = new Signal<number>();

  #pumping = false;
  #travel = 1;
  #lastFrame = 0;
  #running = false;
  #frameHandle = 0;

  readonly #inputs: BellowsInputs;
  readonly #onPressure: (pressure: number, speaking: boolean) => void;

  constructor(inputs: BellowsInputs, onPressure: (pressure: number, speaking: boolean) => void) {
    this.#inputs = inputs;
    this.#onPressure = onPressure;
  }

  /**
   * Press and hold fills the reservoir. `travel` is how far down the paddle
   * the finger has dragged, 0…1, which scales the rate from 0.6× to 1.4× —
   * the paddle is analogue, not a button.
   */
  startPumping(travel = 0.5): void {
    this.#pumping = true;
    this.setTravel(travel);
  }

  setTravel(travel: number): void {
    const clamped = Math.min(1, Math.max(0, travel));
    this.#travel = PUMP_TRAVEL_RATE.min + clamped * (PUMP_TRAVEL_RATE.max - PUMP_TRAVEL_RATE.min);
  }

  stopPumping(): void {
    this.#pumping = false;
  }

  get isPumping(): boolean {
    return this.#pumping;
  }

  /** True once there is enough air for the reeds to speak at all. */
  get speaking(): boolean {
    return this.pressure >= BELLOWS.speakThreshold;
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    this.#lastFrame = performance.now();
    const tick = (now: number): void => {
      if (!this.#running) return;
      // Clamp the step so a backgrounded tab does not empty the reservoir in
      // one frame when it comes back.
      const dt = Math.min(0.1, (now - this.#lastFrame) / 1000);
      this.#lastFrame = now;
      this.step(dt);
      this.#frameHandle = requestAnimationFrame(tick);
    };
    this.#frameHandle = requestAnimationFrame(tick);
  }

  stop(): void {
    this.#running = false;
    cancelAnimationFrame(this.#frameHandle);
  }

  /** One simulation step. Exposed so the model can be checked without a clock. */
  step(dt: number): void {
    if (this.#pumping) {
      this.pressure += BELLOWS.pumpRate * this.#travel * dt;
    }

    this.pressure -= BELLOWS.passiveLeak * dt;

    const notes = this.#inputs.soundingNotes();
    if (notes > 0) {
      const perNote = BELLOWS.drawFirstNote + (notes - 1) * BELLOWS.drawEachExtra;
      this.pressure -= perNote * this.#bankWeight() * dt;
    }

    // Pushing harder than the reservoir can hold is simply wasted effort, as
    // on a real instrument.
    if (this.pressure > BELLOWS.max) this.pressure = BELLOWS.max;
    if (this.pressure < 0) this.pressure = 0;

    if (this.#inputs.assistMode() && this.pressure < BELLOWS.assistFloor) {
      this.pressure = BELLOWS.assistFloor;
    }

    this.#onPressure(this.pressure, this.speaking);
    this.onFrame.emit(this.pressure);
  }

  /**
   * How thirsty the current registration is, 0…1.
   *
   * Doc 03 gives per-bank weights "weighted by fader level" without saying how
   * they combine. Normalising by the total weight is the reading that matches
   * the timings doc 08 asks for: with the default stops, one held note drains
   * a full reservoir in about nine seconds. See DECISIONS.md.
   */
  #bankWeight(): number {
    const { bass, male, female } = BELLOWS.bankDraw;
    const weighted =
      bass * this.#inputs.bankLevel('bass') +
      male * this.#inputs.bankLevel('male') +
      female * this.#inputs.bankLevel('female');
    return weighted / BANK_WEIGHT_TOTAL;
  }

  /** Cents the reeds sharpen by at the current pressure. */
  static pitchCents(pressure: number): number {
    return (pressure - PRESSURE.pitch.centre) * PRESSURE.pitch.span;
  }
}
