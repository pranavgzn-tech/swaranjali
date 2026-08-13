/**
 * The reverb impulse, generated in code — there is no IR file to download,
 * which is part of how the app works in aeroplane mode.
 *
 * Exponentially decaying filtered noise, decorrelated between the channels so
 * the tail has width instead of sitting in the middle of the head.
 */

import { REVERB } from '../config/audio.ts';

export function buildReverbImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, frames, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    // A one-pole lowpass on the noise keeps the tail warm rather than hissy.
    let previous = 0;
    for (let i = 0; i < frames; i++) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.72 + white * 0.28;
      data[i] = previous * Math.pow(1 - i / frames, REVERB.decay);
    }
  }
  return impulse;
}
