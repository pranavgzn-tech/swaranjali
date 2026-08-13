/**
 * The stop mixer: nine stops and a master.
 *
 * Level faders are logarithmic in perceived loudness (`value ^ 2.2`); reverb
 * is a linear wet mix. Each bank has one bus gain that every voice feeds, so
 * moving a fader touches one node rather than thirty-six.
 */

import { FADER_CURVE_EXPONENT, FADER_DEFAULTS, LINEAR_FADERS, type FaderId } from '../config/audio.ts';
import type { Body } from './body.ts';

/** Voice output routes. The coupler is a bus of its own so its fader works. */
export type VoiceBus = 'bass' | 'male' | 'female' | 'coupler';

const VOICE_BUSES: readonly VoiceBus[] = ['bass', 'male', 'female', 'coupler'] as const;

export class Mixer {
  readonly #buses: Record<VoiceBus, GainNode>;
  readonly #body: Body;
  readonly #values = new Map<FaderId, number>();
  /** Set by the instrument once the drone and tanpura exist. */
  #onDrone: ((id: FaderId, shaped: number) => void) | null = null;
  #onTanpura: ((shaped: number) => void) | null = null;

  constructor(ctx: AudioContext, body: Body) {
    this.#body = body;
    this.#buses = {
      bass: ctx.createGain(),
      male: ctx.createGain(),
      female: ctx.createGain(),
      coupler: ctx.createGain(),
    };
    for (const bus of VOICE_BUSES) this.#buses[bus].connect(body.instrumentBus);
  }

  /** Where a voice's sub-voice for this bank should connect. */
  bus(bus: VoiceBus): AudioNode {
    return this.#buses[bus];
  }

  /** The stored 0…1 position of a fader, before any curve. */
  value(id: FaderId): number {
    return this.#values.get(id) ?? FADER_DEFAULTS[id];
  }

  /** Move a fader. Applies the loudness curve and routes it to its target. */
  set(id: FaderId, value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    this.#values.set(id, clamped);
    const shaped = LINEAR_FADERS.includes(id) ? clamped : Math.pow(clamped, FADER_CURVE_EXPONENT);

    switch (id) {
      case 'bass':
      case 'male':
      case 'female':
      case 'coupler':
        this.#buses[id].gain.value = shaped;
        return;
      case 'reverb':
        this.#body.setReverbWet(shaped);
        return;
      case 'master':
        this.#body.setMasterGain(shaped);
        return;
      case 'droneSaMandra':
      case 'droneSaMadhya':
      case 'dronePaMa':
        this.#onDrone?.(id, shaped);
        return;
      case 'tanpura':
        this.#onTanpura?.(shaped);
        return;
    }
  }

  /** Wired once at boot, after the drone and tanpura have been built. */
  route(handlers: { drone: (id: FaderId, shaped: number) => void; tanpura: (shaped: number) => void }): void {
    this.#onDrone = handlers.drone;
    this.#onTanpura = handlers.tanpura;
  }

  /** How much air each bank is drawing, for the bellows model. */
  bankLevel(bus: VoiceBus): number {
    return this.value(bus);
  }
}
