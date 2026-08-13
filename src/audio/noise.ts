/**
 * One looping noise buffer for the whole instrument.
 *
 * The chiff, the key-off thump, the air hiss and the bellows return all need
 * noise. A single source started at boot and fanned out costs one node; an
 * `AudioBufferSourceNode` per burst would mean allocating in the audio path,
 * which is the one thing we never do.
 */

/** Two seconds is long enough that the loop is inaudible. */
const NOISE_SECONDS = 2;

export function createNoiseSource(ctx: AudioContext): AudioNode {
  const frames = Math.floor(ctx.sampleRate * NOISE_SECONDS);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) channel[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.start();
  return source;
}
