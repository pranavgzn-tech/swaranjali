/**
 * The boot benchmark that picks the audio tier.
 *
 * Do not guess from the device name — a slow device with a large screen needs
 * the lite tier too, and an iPad in Split View is still an iPad. Instead, time
 * the two expensive pieces of setup during the "Tap to begin" screen: building
 * the wavetables and the reverb impulse. If that takes too long, everything
 * else will be slow too.
 */

import { REVERB } from '../config/audio.ts';
import { BENCHMARK_LITE_TIER_MS, type AudioTier } from '../config/compact-audio.ts';
import { buildReverbImpulse } from '../audio/reverb-impulse.ts';
import { buildReedWaves } from '../audio/wavetables.ts';

export interface BenchmarkResult {
  tier: AudioTier;
  elapsedMs: number;
}

/** Runs before the instrument is built, because it decides how to build it. */
export function benchmark(ctx: AudioContext): BenchmarkResult {
  const started = performance.now();
  buildReedWaves(ctx);
  buildReverbImpulse(ctx, REVERB.seconds);
  const elapsedMs = performance.now() - started;

  return { tier: elapsedMs > BENCHMARK_LITE_TIER_MS ? 'lite' : 'full', elapsedMs };
}
