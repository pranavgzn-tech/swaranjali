/**
 * The wooden box around the reeds: cabinet resonances, soft saturation, the
 * generated reverb, the speaker profile and the limiter.
 *
 * Everything downstream of the voices lives here. The reverb impulse is built
 * in code — there is no IR file to download, which is part of how the app
 * works in aeroplane mode.
 */

import { BODY, LIMITER, PRESSURE, REVERB } from '../config/audio.ts';
import { SPEAKER_PROFILE, type OutputRoute } from '../config/compact-audio.ts';
import { buildReverbImpulse } from './reverb-impulse.ts';

/** A tanh curve, which rounds peaks the way a driven wooden box does. */
function saturationCurve(drive: number, points: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(points * Float32Array.BYTES_PER_ELEMENT));
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive);
  }
  return curve;
}

export interface BodyOptions {
  reverbSeconds: number;
  maxReverbWet: number;
}

export class Body {
  /** Where every voice connects. */
  readonly instrumentBus: GainNode;
  /** Drone and tabla join after the instrument's own colouring (doc 03). */
  readonly droneBus: GainNode;
  readonly tablaBus: GainNode;
  /** After the limiter: what is recorded is what was heard. */
  readonly recordingTap: GainNode;

  readonly #pressureGain: GainNode;
  readonly #masterGain: GainNode;
  readonly #wetGain: GainNode;
  readonly #highpass: BiquadFilterNode;
  readonly #presence: BiquadFilterNode;
  readonly #maxWet: number;

  constructor(ctx: AudioContext, options: BodyOptions) {
    this.instrumentBus = ctx.createGain();
    this.droneBus = ctx.createGain();
    this.tablaBus = ctx.createGain();

    // Wooden box formants.
    let node: AudioNode = this.instrumentBus;
    for (const resonance of BODY.resonances) {
      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = resonance.freq;
      peak.gain.value = resonance.gain;
      peak.Q.value = resonance.q;
      node = node.connect(peak);
    }

    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = BODY.highShelf.freq;
    shelf.gain.value = BODY.highShelf.gain;
    node = node.connect(shelf);

    const shaper = ctx.createWaveShaper();
    shaper.curve = saturationCurve(BODY.saturationDrive, BODY.saturationCurvePoints);
    shaper.oversample = '2x';
    node = node.connect(shaper);

    // Volume comes from the bellows: gain = pressure ^ 0.75.
    this.#pressureGain = ctx.createGain();
    this.#pressureGain.gain.value = 0;
    node = node.connect(this.#pressureGain);

    this.#masterGain = ctx.createGain();
    node.connect(this.#masterGain);

    // The drone and tabla are not blown by this reservoir, so they join here.
    const mix = ctx.createGain();
    this.#masterGain.connect(mix);
    this.droneBus.connect(mix);
    this.tablaBus.connect(mix);

    // Speaker profile. Always in the chain and set neutral for headphones,
    // because reconnecting nodes mid-session risks a click.
    this.#highpass = ctx.createBiquadFilter();
    this.#highpass.type = 'highpass';
    this.#presence = ctx.createBiquadFilter();
    this.#presence.type = 'peaking';
    this.#presence.frequency.value = SPEAKER_PROFILE.presence.freq;
    this.#presence.Q.value = SPEAKER_PROFILE.presence.q;
    const profiled = mix.connect(this.#highpass).connect(this.#presence);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMITER.threshold;
    limiter.knee.value = LIMITER.knee;
    limiter.ratio.value = LIMITER.ratio;
    limiter.attack.value = LIMITER.attack;
    limiter.release.value = LIMITER.release;

    // Dry straight through, wet in parallel.
    profiled.connect(limiter);

    const preDelay = ctx.createDelay(1);
    preDelay.delayTime.value = REVERB.preDelayMs / 1000;
    const convolver = ctx.createConvolver();
    convolver.buffer = buildReverbImpulse(ctx, options.reverbSeconds);
    this.#wetGain = ctx.createGain();
    this.#maxWet = options.maxReverbWet;
    this.#wetGain.gain.value = Math.min(REVERB.defaultWet, this.#maxWet);
    profiled.connect(preDelay).connect(convolver).connect(this.#wetGain).connect(limiter);

    this.recordingTap = ctx.createGain();
    limiter.connect(this.recordingTap);
    this.recordingTap.connect(ctx.destination);

    this.setOutputRoute('headphones');
  }

  /**
   * Called from the bellows loop, once per frame. Pass 0 when the reeds have
   * stopped speaking; `timeConstant` is how fast the change is allowed to be,
   * which is longer on the way out so the reeds fade rather than cut.
   */
  setPressure(pressure: number, atTime: number, timeConstant: number): void {
    const gain = Math.pow(Math.max(0, pressure), PRESSURE.gainExponent);
    this.#pressureGain.gain.setTargetAtTime(gain, atTime, timeConstant);
  }

  /** Master fader, already through the loudness curve. */
  setMasterGain(gain: number): void {
    this.#masterGain.gain.value = gain;
  }

  /** Reverb is a linear wet mix, clamped on small speakers. */
  setReverbWet(wet: number): void {
    this.#wetGain.gain.value = Math.min(wet, this.#maxWet);
  }

  /**
   * The web cannot tell whether headphones are plugged in, so this comes from
   * a settings toggle. On speaker the low end is removed before it can eat
   * headroom and make the limiter pump.
   */
  setOutputRoute(route: OutputRoute): void {
    const speaker = route === 'speaker';
    this.#highpass.frequency.value = speaker ? SPEAKER_PROFILE.highpass.freq : 20;
    this.#highpass.Q.value = SPEAKER_PROFILE.highpass.q;
    this.#presence.gain.value = speaker ? SPEAKER_PROFILE.presence.gain : 0;
  }
}
