/**
 * The seam between the reed model and everything around it.
 *
 * `SynthReedSource` implements this now. A `SampledReedSource` can implement
 * it later with looped `AudioBufferSourceNode`s, one sample every three
 * semitones, and the bellows model, mixer, body and reverb stay exactly as
 * they are (doc 03).
 */
export interface ToneSource {
  /** Retune and start speaking. Must be synchronous and allocation-free. */
  noteOn(freqHz: number, atTime: number): void;

  /** Stop speaking, with the release the model calls for. */
  noteOff(atTime: number): void;

  /**
   * Current air pressure, 0…1.
   *
   * Filter cutoff and pitch follow pressure through a shared audio-rate
   * signal rather than per-voice parameter writes, so what a source needs
   * this for is anything it cannot express that way — for the synth reed,
   * the chiff level at the moment of attack.
   */
  setPressure(pressure: number): void;
}
