/**
 * The tanpura: four plucked strings, cycling.
 *
 * Not a reed and not part of the harmonium — a separate model, and it does
 * **not** draw air from the reservoir.
 *
 * Each string is a Karplus-Strong loop: a burst of noise fed into a delay line
 * that is one period long, with a lowpass in the feedback path so the high
 * partials die away faster than the low ones, which is what a real string
 * does. The buzz — *jawari* — comes from the curved bridge a tanpura's strings
 * lie against: as the string vibrates it grazes the bridge, which folds energy
 * upward into a shimmer that keeps ringing. A gentle nonlinearity inside the
 * loop is the honest way to get that from a delay line.
 */

import { TANPURA } from '../config/audio.ts';
import { frequencyOf, madhyaSa } from '../music/pitch.ts';

export type TanpuraNote = 'pa' | 'ma';

/** Semitones from madhya Sa for the four strings, low string last. */
const STRINGS = [-5, 0, 0, -12] as const;
const MA_FIRST_STRING = -7;

interface StringVoice {
  input: GainNode;
  delay: DelayNode;
  excite: GainNode;
}

/**
 * A soft fold, which is what the bridge does to a string grazing it.
 *
 * The tanh term is divided by the drive so the curve's slope through zero is
 * exactly 1. That matters more than it looks: this shaper sits *inside* a
 * feedback loop, and a slope above 1 makes the loop gain exceed 1, at which
 * point it stops being a string that is struck and decays and becomes an
 * oscillator that grows until the shaper clips. Normalised, the curve is
 * transparent to a quiet string and only bends a loud one — which is what a
 * bridge actually does.
 */
function jawariCurve(points: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(points * Float32Array.BYTES_PER_ELEMENT));
  const drive = TANPURA.jawariDrive;
  const fold = TANPURA.jawariFold;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    curve[i] = (Math.tanh(x * drive) / drive) * (1 - fold) + x * fold;
  }
  return curve;
}

export class Tanpura {
  readonly #ctx: AudioContext;
  readonly #output: GainNode;
  readonly #strings: StringVoice[] = [];
  readonly #random: () => number;

  #sa = 0;
  #referenceA4 = 440;
  #note: TanpuraNote = 'pa';
  #level = 0;
  #nextPluck = 0;
  #stringIndex = 0;

  constructor(ctx: AudioContext, noise: AudioNode, destination: AudioNode, random: () => number) {
    this.#ctx = ctx;
    this.#random = random;

    this.#output = ctx.createGain();
    this.#output.gain.value = 0;
    this.#output.connect(destination);

    const curve = jawariCurve(TANPURA.jawariCurvePoints);

    for (let i = 0; i < STRINGS.length; i++) {
      const excite = ctx.createGain();
      excite.gain.value = 0;
      noise.connect(excite);

      const input = ctx.createGain();
      excite.connect(input);

      const delay = ctx.createDelay(1);
      delay.delayTime.value = 1 / 130;

      const damping = ctx.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.value = TANPURA.dampingHz;
      damping.Q.value = TANPURA.dampingQ;

      // A lowpass passes DC at full gain, so the small offset in a burst of
      // noise circulates undamped and builds up until the loop blows up. A
      // real string cannot hold a constant displacement either; this is the
      // filter that says so.
      const dcBlock = ctx.createBiquadFilter();
      dcBlock.type = 'highpass';
      dcBlock.frequency.value = TANPURA.dcBlockHz;
      dcBlock.Q.value = TANPURA.dampingQ;

      const feedback = ctx.createGain();
      feedback.gain.value = TANPURA.feedback;

      // The loop: in -> delay -> damping -> dc block -> feedback -> back in.
      // Nothing nonlinear inside it. A shaper in the feedback path kept the
      // loop gain above 1 however far the feedback was turned down, so a
      // single pluck grew instead of decaying — a buzz, not a string.
      input.connect(delay).connect(damping).connect(dcBlock).connect(feedback).connect(input);

      // The bridge sits on the way out instead. Jawari is what the bridge does
      // to the sound the string radiates, so shaping the output is both the
      // stable choice and the more faithful one.
      const bridge = ctx.createWaveShaper();
      bridge.curve = curve;
      bridge.oversample = '2x';
      delay.connect(bridge).connect(this.#output);

      this.#strings.push({ input, delay, excite });
    }
  }

  setTuning(saPitchClass: number, referenceA4: number): void {
    this.#sa = saPitchClass;
    this.#referenceA4 = referenceA4;
    this.#retune();
  }

  setNote(note: TanpuraNote): void {
    if (note === this.#note) return;
    this.#note = note;
    this.#retune();
  }

  /** Fader level, already through the loudness curve. */
  setLevel(value: number): void {
    const wasOff = this.#level <= 0.001;
    this.#level = value;
    this.#output.gain.setTargetAtTime(value, this.#ctx.currentTime, 0.05);

    if (value > 0.001 && wasOff) {
      this.#nextPluck = this.#ctx.currentTime + 0.05;
      this.#stringIndex = 0;
    }
  }

  /** Called from the shared lookahead tick. */
  schedule(horizon: number): void {
    if (this.#level <= 0.001) return;

    while (this.#nextPluck < horizon) {
      this.#pluck(this.#stringIndex, Math.max(this.#nextPluck, this.#ctx.currentTime));
      this.#stringIndex = (this.#stringIndex + 1) % this.#strings.length;
      // A player's hand is not a metronome, so the gap between strings varies.
      const spread = TANPURA.pluckMaxS - TANPURA.pluckMinS;
      this.#nextPluck += TANPURA.pluckMinS + this.#random() * spread;
    }
  }

  silence(): void {
    this.#level = 0;
    this.#output.gain.cancelScheduledValues(this.#ctx.currentTime);
    this.#output.gain.setValueAtTime(0, this.#ctx.currentTime);
  }

  #retune(): void {
    for (let i = 0; i < this.#strings.length; i++) {
      const string = this.#strings[i];
      if (!string) continue;
      string.delay.delayTime.setTargetAtTime(1 / this.#frequency(i), this.#ctx.currentTime, 0.05);
    }
  }

  #frequency(index: number): number {
    const offset = index === 0 && this.#note === 'ma' ? MA_FIRST_STRING : (STRINGS[index] ?? 0);
    return frequencyOf(madhyaSa(this.#sa) + offset, 0, this.#referenceA4);
  }

  /** A short burst of noise into the loop — the finger leaving the string. */
  #pluck(index: number, atTime: number): void {
    const string = this.#strings[index];
    if (!string) return;
    const gain = string.excite.gain;
    gain.cancelScheduledValues(atTime);
    gain.setValueAtTime(TANPURA.pluckGain, atTime);
    gain.linearRampToValueAtTime(0, atTime + TANPURA.pluckMs / 1000);
  }
}
