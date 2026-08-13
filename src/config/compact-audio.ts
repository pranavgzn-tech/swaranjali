/**
 * Audio constants for the lite tier, from docs/11-responsive-layouts.md.
 *
 * The engine is identical — only these numbers change. The tier is chosen by
 * the boot benchmark, not by viewport and never by user agent, because a slow
 * device with a large screen needs the lite tier too.
 */

export const COMPACT_AUDIO = {
  voicePoolSize: 8, // 12 on regular — fewer fingers fit anyway
  oscPerBank: 2, // drop the third oscillator
  reverbSeconds: 0.8, // 1.1 on regular; long reverb on a small speaker is mush
  maxReverbWet: 0.12,
  defaultBassFader: 0.25, // 0.55 on regular
} as const;

/**
 * Applied when the output route is 'speaker'. Bypassed for headphones. The
 * iPhone speaker has no low end, so the bass 16′ reed would only eat headroom
 * and make the limiter pump.
 */
export const SPEAKER_PROFILE = {
  highpass: { freq: 180, q: 0.7 },
  presence: { freq: 2500, gain: 2.0, q: 0.9 },
} as const;

/**
 * Boot benchmark threshold. Building the wavetables and the reverb impulse is
 * timed during "Tap to begin"; over this many milliseconds we drop to the lite
 * tier and say so in the diagnostics panel.
 */
export const BENCHMARK_LITE_TIER_MS = 90;

export type AudioTier = 'full' | 'lite';
export type OutputRoute = 'speaker' | 'headphones';
