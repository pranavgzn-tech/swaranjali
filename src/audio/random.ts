/**
 * A seeded generator, so the instrument sounds the same on every launch.
 *
 * The drift rates and wavetable phases are scattered rather than uniform, but
 * they are not random from run to run: two builds should sound identical, and
 * a sound-design change should be something we made, not something we rolled.
 */

/** mulberry32 — small, fast, and good enough for scatter. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
