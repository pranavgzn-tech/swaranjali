/**
 * The instrument: everything below the UI, wired together once at boot.
 *
 * The path from a finger landing to `gain.setValueAtTime` runs through
 * `noteOn` and is synchronous, allocation-free, and about a dozen parameter
 * writes long. Anything that would grow with the number of voices — pressure,
 * cutoff, the pitch sharpening — is driven by a shared audio-rate signal
 * instead, so the per-frame cost does not depend on how many keys are down.
 */

import { BANK_IDS, PRESSURE, VOICE_POOL, type BankId, type FaderId } from '../config/audio.ts';
import { BELLOWS } from '../config/audio.ts';
import { COMPACT_AUDIO, type AudioTier, type OutputRoute } from '../config/compact-audio.ts';
import { REVERB } from '../config/audio.ts';
import { frequencyOf, madhyaSa, REFERENCE_A4_DEFAULT } from '../music/pitch.ts';
import { Bellows } from './bellows.ts';
import { Body } from './body.ts';
import { Drone, type DroneNote } from './drone.ts';
import { Mixer } from './mixer.ts';
import { Tabla } from './percussion.ts';
import { Recorder } from './recorder.ts';
import { TaalEngine } from './taal-engine.ts';
import { createNoiseSource } from './noise.ts';
import { Lookahead } from './scheduler.ts';
import { Tanpura } from './tanpura.ts';
import { VoicePool, type KeyId } from './voice-pool.ts';
import { buildReedWaves } from './wavetables.ts';

/** Smoothing for per-frame parameter writes; short enough to feel immediate. */
const PRESSURE_SMOOTHING = 0.01;

export interface InstrumentInputs {
  assistMode(): boolean;
  referenceA4(): number;
  sa(): number;
  droneNote(): DroneNote;
}

export class Instrument {
  readonly mixer: Mixer;
  readonly bellows: Bellows;
  readonly body: Body;
  readonly drone: Drone;
  readonly tanpura: Tanpura;
  readonly clock: Lookahead;
  readonly tabla: Tabla;
  readonly taal: TaalEngine;
  readonly recorder: Recorder;
  readonly tier: AudioTier;

  readonly #ctx: AudioContext;
  readonly #voices: VoicePool;
  readonly #pressureSignal: ConstantSourceNode;
  readonly #pitchCentsSignal: ConstantSourceNode;
  readonly #hissGain: GainNode;
  readonly #returnGain: GainNode;
  readonly #inputs: InstrumentInputs;
  /** Time constant for the fade when the reeds stop speaking. */
  readonly #fadeOut = BELLOWS.fadeOutMs / 1000 / 3;

  constructor(ctx: AudioContext, tier: AudioTier, inputs: InstrumentInputs, random: () => number) {
    this.#ctx = ctx;
    this.#inputs = inputs;
    this.tier = tier;

    const lite = tier === 'lite';
    this.body = new Body(ctx, {
      reverbSeconds: lite ? COMPACT_AUDIO.reverbSeconds : REVERB.seconds,
      maxReverbWet: lite ? COMPACT_AUDIO.maxReverbWet : 1,
    });
    this.mixer = new Mixer(ctx, this.body);

    const noise = createNoiseSource(ctx);

    // Air hiss rises with pressure — the sound of the instrument breathing.
    this.#hissGain = ctx.createGain();
    this.#hissGain.gain.value = 0;
    noise.connect(this.#hissGain).connect(this.body.instrumentBus);

    // The soft swell as the bellows returns on release.
    const returnFilter = ctx.createBiquadFilter();
    returnFilter.type = 'lowpass';
    returnFilter.frequency.value = 900;
    this.#returnGain = ctx.createGain();
    this.#returnGain.gain.value = 0;
    noise.connect(returnFilter).connect(this.#returnGain).connect(this.body.instrumentBus);

    // One pressure signal, scaled per bank into each filter's cutoff. This is
    // why pressure costs the same whether one key is down or twelve.
    this.#pressureSignal = ctx.createConstantSource();
    this.#pressureSignal.offset.value = 0;
    this.#pressureSignal.start();

    const cutoffSignals = {} as Record<BankId, AudioNode>;
    for (const bank of BANK_IDS) {
      const span = ctx.createGain();
      span.gain.value = PRESSURE.cutoffHz[bank].span;
      this.#pressureSignal.connect(span);
      cutoffSignals[bank] = span;
    }

    this.#pitchCentsSignal = ctx.createConstantSource();
    this.#pitchCentsSignal.offset.value = 0;
    this.#pitchCentsSignal.start();

    this.#voices = new VoicePool(
      ctx,
      buildReedWaves(ctx),
      this.mixer,
      noise,
      lite ? COMPACT_AUDIO.voicePoolSize : VOICE_POOL.size,
      lite ? COMPACT_AUDIO.oscPerBank : VOICE_POOL.oscPerBank,
      cutoffSignals,
      this.#pitchCentsSignal,
      random,
    );

    // Drone reeds are reeds: they run through the instrument bus so the body,
    // the saturation and the air pressure shape them exactly as they shape a
    // keyed note. The tanpura is not a reed and joins further down, past all
    // of that, because none of it should colour a plucked string.
    this.drone = new Drone(ctx, {
      waves: buildReedWaves(ctx),
      oscCount: lite ? COMPACT_AUDIO.oscPerBank : VOICE_POOL.oscPerBank,
      cutoffSignals,
      pitchCentsSignal: this.#pitchCentsSignal,
      destination: this.body.instrumentBus,
      random,
    });

    this.clock = new Lookahead(ctx);
    this.tanpura = new Tanpura(ctx, noise, this.body.droneBus, random);
    this.tabla = new Tabla(ctx, noise, this.body.tablaBus);
    this.taal = new TaalEngine(this.clock, this.tabla);
    this.recorder = new Recorder(ctx, this.body.recordingTap);

    this.mixer.route({
      drone: (id, shaped) => this.drone.setLevel(id, shaped),
      // The tanpura fader is deliberately not wired yet: its string model
      // still runs away rather than decaying. Built, measured, not shipped —
      // see DECISIONS.md.
      tanpura: () => {},
    });

    this.bellows = new Bellows(
      {
        // Drone reeds draw air like any other note — authentic, and the first
        // thing that explains why the reservoir empties faster with them up.
        soundingNotes: () => this.#voices.activeCount + this.drone.activeCount,
        bankLevel: (bank) => this.mixer.bankLevel(bank),
        assistMode: () => this.#inputs.assistMode(),
      },
      (pressure, speaking) => this.#applyPressure(pressure, speaking),
    );
  }

  get activeVoices(): number {
    return this.#voices.activeCount;
  }

  /** Start the bellows loop. Nothing sounds until the reservoir has air. */
  start(): void {
    this.bellows.start();
    // The tanpura is not on the clock yet; the taal engine is.
    this.clock.start((horizon) => this.taal.schedule(horizon));
    this.retune();
  }

  /** Sa or the reference pitch changed; the drone and tanpura follow. */
  retune(): void {
    const sa = this.#inputs.sa();
    const a4 = this.#inputs.referenceA4();
    this.drone.setTuning(sa, a4);
    this.drone.setNote(this.#inputs.droneNote());
    // A player tunes the dayan to the singer's Sa.
    this.tabla.setSa(frequencyOf(madhyaSa(sa), 0, a4));
  }

  /**
   * Sound a key. Called straight from `pointerdown` — no await, no allocation,
   * nothing between the finger and the reed.
   */
  noteOn(key: KeyId): void {
    const freq = frequencyOf(key, 0, this.#inputs.referenceA4());
    this.#voices.noteOn(key, freq, this.#ctx.currentTime, this.bellows.pressure);
  }

  noteOff(key: KeyId): void {
    this.#voices.noteOff(key, this.#ctx.currentTime);
  }

  /** Release every voice — panic, interruption, or rotation. */
  silenceAll(): void {
    this.#voices.silenceAll();
    this.drone.silenceAll();
    this.tanpura.silence();
    this.tabla.silence();
  }

  setFader(id: FaderId, value: number): void {
    this.mixer.set(id, value);
  }

  setOutputRoute(route: OutputRoute): void {
    this.body.setOutputRoute(route);
  }

  /** The bellows returning: a soft filtered swell, then nothing. */
  pumpReleased(): void {
    const now = this.#ctx.currentTime;
    const gain = this.#returnGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0.05, now + 0.04);
    gain.linearRampToValueAtTime(0, now + 0.18);
  }

  #applyPressure(pressure: number, speaking: boolean): void {
    const now = this.#ctx.currentTime;
    this.#pressureSignal.offset.setTargetAtTime(pressure, now, PRESSURE_SMOOTHING);
    this.#pitchCentsSignal.offset.setTargetAtTime(Bellows.pitchCents(pressure), now, PRESSURE_SMOOTHING);
    this.#hissGain.gain.setTargetAtTime(pressure * PRESSURE.hissLevel, now, PRESSURE_SMOOTHING);
    this.body.setPressure(speaking ? pressure : 0, now, speaking ? PRESSURE_SMOOTHING : this.#fadeOut);
    this.#voices.setPressure(pressure);
    this.drone.setPressure(pressure);
  }
}

export { REFERENCE_A4_DEFAULT };
