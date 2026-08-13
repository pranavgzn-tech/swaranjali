/**
 * Tabla strokes, synthesised.
 *
 * A tabla is two drums. The *dayan* is the small right-hand drum, tuned — to
 * Sa here, as a player would tune it to the singer. The *bayan* is the big
 * left-hand drum, low and boomy, and its pitch bends as the heel of the palm
 * presses the head.
 *
 * Both are modelled the same way: a short pitched tone that drops rapidly in
 * pitch, plus a burst of filtered noise for the slap of skin on skin. Whether
 * a stroke rings on or is damped by a finger left on the head is the single
 * biggest difference between one bol and another.
 *
 * Doc 10 is honest that synthesised tabla is hard to make convincing, and doc
 * 03 says to stop rather than ship a poor one. This is the attempt; whether it
 * passes is a question for ears, not for a measurement.
 */

import { TABLA } from '../config/audio.ts';

/** How a single stroke is made. */
export interface Stroke {
  /** Multiple of the drum's tuned frequency. */
  ratio: number;
  /** How far the pitch falls, as a multiple of where it started. */
  drop: number;
  dropMs: number;
  decayMs: number;
  /** Level of the skin noise, 0…1. */
  noise: number;
  noiseHz: number;
  /** A ringing stroke, or one damped by a finger left on the head. */
  open: boolean;
  /** The low drum instead of the tuned one. */
  bayan?: boolean;
}

const RING: Stroke = { ratio: 1, drop: 0.9, dropMs: 40, decayMs: 620, noise: 0.25, noiseHz: 2600, open: true };
const CLOSED: Stroke = { ratio: 1.5, drop: 0.6, dropMs: 12, decayMs: 90, noise: 0.7, noiseHz: 4200, open: false };
const BAYAN: Stroke = { ratio: 0.34, drop: 0.55, dropMs: 90, decayMs: 700, noise: 0.3, noiseHz: 700, open: true, bayan: true };

/**
 * Bols to strokes. A bol beginning with "Dh" is both drums struck together —
 * that is what makes it the full, round sound the cycle lands on.
 */
const BOLS: Readonly<Record<string, Stroke[]>> = {
  // Dayan alone, ringing.
  Na: [RING],
  Ta: [RING],
  Tin: [{ ...RING, ratio: 1.5 }],
  Tun: [{ ...RING, ratio: 0.75, decayMs: 800 }],
  Din: [{ ...RING, ratio: 1.25 }],
  // Dayan alone, damped.
  Te: [CLOSED],
  Ti: [CLOSED],
  Ke: [{ ...CLOSED, ratio: 1.2 }],
  Ka: [{ ...CLOSED, ratio: 1.2 }],
  Kat: [{ ...CLOSED, ratio: 1.2 }],
  Re: [{ ...CLOSED, ratio: 1.8, decayMs: 70 }],
  // Bayan.
  Ge: [BAYAN],
  Ghe: [BAYAN],
  // A bayan stroke stopped by the heel of the palm rather than left to ring.
  Ke_bayan: [{ ...BAYAN, drop: 0.7, decayMs: 150, open: false }],
  // Both drums together.
  Dha: [BAYAN, RING],
  Dhin: [BAYAN, { ...RING, ratio: 1.5 }],
  Dhi: [BAYAN, { ...RING, ratio: 1.5, decayMs: 420 }],
};

/** Bols that fill one matra with more than one stroke. */
const COMPOUND: Readonly<Record<string, string[]>> = {
  Dhage: ['Dha', 'Ge'],
  Tirakita: ['Ti', 'Re', 'Ke', 'Ta'],
  Kita: ['Ke', 'Ta'],
  Tita: ['Ti', 'Ta'],
  Kata: ['Ka', 'Ta'],
  Gadi: ['Ge', 'Din'],
  Ghene: ['Ghe', 'Na'],
};

interface StrokeVoice {
  osc: OscillatorNode;
  oscGain: GainNode;
  noiseGain: GainNode;
  filter: BiquadFilterNode;
}

export class Tabla {
  readonly #ctx: AudioContext;
  readonly #voices: StrokeVoice[] = [];
  readonly #output: GainNode;
  #next = 0;
  #saHz = 261.63;

  constructor(ctx: AudioContext, noise: AudioNode, destination: AudioNode) {
    this.#ctx = ctx;
    this.#output = ctx.createGain();
    this.#output.gain.value = TABLA.level;
    this.#output.connect(destination);

    // Pre-allocated, like the reeds: a stroke retunes and retriggers a voice
    // rather than building one, so nothing is created while playing.
    for (let i = 0; i < TABLA.voices; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const oscGain = ctx.createGain();
      oscGain.gain.value = 0;
      osc.connect(oscGain).connect(this.#output);
      osc.start();

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = TABLA.noiseQ;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0;
      noise.connect(filter).connect(noiseGain).connect(this.#output);

      this.#voices.push({ osc, oscGain, noiseGain, filter });
    }
  }

  /** A player tunes the dayan to the singer's Sa, so we do too. */
  setSa(frequencyHz: number): void {
    this.#saHz = frequencyHz;
  }

  /** Every stroke a bol makes, spread across the matra it occupies. */
  play(bol: string, atTime: number, matraSeconds: number): void {
    if (bol === '-' || bol === '') return;

    const parts = COMPOUND[bol];
    if (parts) {
      // The strokes of a compound bol share the beat between them.
      const step = (matraSeconds * TABLA.compoundSpread) / parts.length;
      parts.forEach((part, index) => this.play(part, atTime + index * step, matraSeconds));
      return;
    }

    const strokes = BOLS[bol];
    if (!strokes) return;
    for (const stroke of strokes) this.#strike(stroke, atTime);
  }

  silence(): void {
    const now = this.#ctx.currentTime;
    for (const voice of this.#voices) {
      voice.oscGain.gain.cancelScheduledValues(now);
      voice.oscGain.gain.setValueAtTime(0, now);
      voice.noiseGain.gain.cancelScheduledValues(now);
      voice.noiseGain.gain.setValueAtTime(0, now);
    }
  }

  #strike(stroke: Stroke, atTime: number): void {
    const voice = this.#voices[this.#next];
    this.#next = (this.#next + 1) % this.#voices.length;
    if (!voice) return;

    const base = (stroke.bayan ? TABLA.bayanRatio : 1) * this.#saHz * stroke.ratio;
    const decay = stroke.decayMs / 1000;

    // The head is tightest at the moment of the strike and slackens: pitch
    // falls fast, which is most of what makes a drum sound struck.
    voice.osc.frequency.cancelScheduledValues(atTime);
    voice.osc.frequency.setValueAtTime(base, atTime);
    voice.osc.frequency.exponentialRampToValueAtTime(base * stroke.drop, atTime + stroke.dropMs / 1000);

    const gain = voice.oscGain.gain;
    gain.cancelScheduledValues(atTime);
    gain.setValueAtTime(0, atTime);
    gain.linearRampToValueAtTime(stroke.open ? 1 : 0.75, atTime + TABLA.attackMs / 1000);
    gain.exponentialRampToValueAtTime(0.0001, atTime + decay);
    gain.setValueAtTime(0, atTime + decay);

    // The slap of the hand, which is short whether or not the tone rings on.
    voice.filter.frequency.setValueAtTime(stroke.noiseHz, atTime);
    const noise = voice.noiseGain.gain;
    noise.cancelScheduledValues(atTime);
    noise.setValueAtTime(stroke.noise, atTime);
    noise.exponentialRampToValueAtTime(0.0001, atTime + TABLA.slapMs / 1000);
    noise.setValueAtTime(0, atTime + TABLA.slapMs / 1000);
  }
}
