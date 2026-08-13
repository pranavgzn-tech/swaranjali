/**
 * The pre-allocated voice pool.
 *
 * Twelve voices on the full tier, eight on lite. Each owns a sub-voice per
 * reed bank plus the coupler, and every oscillator inside them runs from boot.
 * Nothing here creates or destroys a node once `build()` has returned — that
 * is the whole point of the pool, and it is why a key press is only a handful
 * of parameter writes.
 */

import { COUPLER, type BankId } from '../config/audio.ts';
import { KeyNoise, dbToGain } from './chiff.ts';
import type { Mixer } from './mixer.ts';
import { SynthReedSource } from './reed-bank.ts';
import type { ReedWaves } from './wavetables.ts';

/** A key's identity: its integer semitone distance from A4. */
export type KeyId = number;

class Voice {
  readonly #sources: SynthReedSource[];
  readonly #noise: KeyNoise;

  key: KeyId | null = null;
  /** Set while a finger is physically down. Never steal one of these. */
  held = false;
  startedAt = 0;

  constructor(
    ctx: AudioContext,
    waves: ReedWaves,
    mixer: Mixer,
    noise: AudioNode,
    oscCount: number,
    cutoffSignals: Record<BankId, AudioNode>,
    pitchCentsSignal: AudioNode,
    random: () => number,
  ) {
    const source = (bank: BankId, extra?: { semitoneOffset: number; attackExtraMs: number; peak: number }) =>
      new SynthReedSource(ctx, {
        bank,
        wave: waves[bank],
        oscCount,
        cutoffSignal: cutoffSignals[bank],
        pitchCentsSignal,
        destination: mixer.bus(extra ? 'coupler' : bank),
        random,
        ...(extra ?? {}),
      });

    this.#sources = [
      source('bass'),
      source('male'),
      source('female'),
      // A mechanical coupler sounds the same note an octave up on the male
      // bank, a little later and a little quieter.
      source('male', {
        semitoneOffset: COUPLER.semitones,
        attackExtraMs: COUPLER.extraAttackMs,
        peak: dbToGain(COUPLER.levelDb),
      }),
    ];

    this.#noise = new KeyNoise(ctx, noise, mixer.bus('male'));
  }

  setPressure(pressure: number): void {
    for (const source of this.#sources) source.setPressure(pressure);
  }

  noteOn(key: KeyId, freqHz: number, atTime: number, pressure: number): void {
    this.key = key;
    this.held = true;
    this.startedAt = atTime;
    for (const source of this.#sources) source.noteOn(freqHz, atTime);
    this.#noise.chiff(freqHz, atTime, pressure);
  }

  noteOff(atTime: number): void {
    this.held = false;
    for (const source of this.#sources) source.noteOff(atTime);
    this.#noise.thump(atTime);
  }

  silence(): void {
    this.held = false;
    this.key = null;
    for (const source of this.#sources) source.silence();
  }
}

export class VoicePool {
  readonly #voices: Voice[] = [];
  /** Which voice is currently sounding a key. */
  readonly #byKey = new Map<KeyId, Voice>();

  constructor(
    ctx: AudioContext,
    waves: ReedWaves,
    mixer: Mixer,
    noise: AudioNode,
    size: number,
    oscCount: number,
    cutoffSignals: Record<BankId, AudioNode>,
    pitchCentsSignal: AudioNode,
    random: () => number,
  ) {
    for (let i = 0; i < size; i++) {
      this.#voices.push(new Voice(ctx, waves, mixer, noise, oscCount, cutoffSignals, pitchCentsSignal, random));
    }
  }

  get activeCount(): number {
    return this.#byKey.size;
  }

  /** Fan the current pressure out to every voice. Called once per frame. */
  setPressure(pressure: number): void {
    for (const voice of this.#voices) voice.setPressure(pressure);
  }

  noteOn(key: KeyId, freqHz: number, atTime: number, pressure: number): void {
    const existing = this.#byKey.get(key);
    if (existing) {
      // Retriggering a sounding key: reuse its voice rather than stacking.
      existing.noteOn(key, freqHz, atTime, pressure);
      return;
    }

    const voice = this.#claim(atTime);
    if (!voice) return;
    if (voice.key !== null) this.#byKey.delete(voice.key);
    voice.noteOn(key, freqHz, atTime, pressure);
    this.#byKey.set(key, voice);
  }

  noteOff(key: KeyId, atTime: number): void {
    const voice = this.#byKey.get(key);
    if (!voice) return;
    voice.noteOff(atTime);
    this.#byKey.delete(key);
  }

  /** Release everything, for panic and for interruptions. */
  silenceAll(): void {
    for (const voice of this.#voices) voice.silence();
    this.#byKey.clear();
  }

  /** Oldest note first, but never one a finger is still holding. */
  #claim(atTime: number): Voice | null {
    let oldest: Voice | null = null;
    for (const voice of this.#voices) {
      if (voice.key === null) return voice;
      if (voice.held) continue;
      if (!oldest || voice.startedAt < oldest.startedAt) oldest = voice;
    }
    if (oldest) return oldest;

    // Every voice is physically held. Steal the oldest anyway — silence would
    // be worse than a dropped note, and this needs eleven fingers to reach.
    let fallback: Voice | null = null;
    for (const voice of this.#voices) {
      if (!fallback || voice.startedAt < fallback.startedAt) fallback = voice;
    }
    if (fallback) fallback.noteOff(atTime);
    return fallback;
  }
}
