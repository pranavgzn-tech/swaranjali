/**
 * Which keys are on screen, and where they sit relative to each other.
 *
 * This is pure arithmetic over key identities — no DOM, no pixels. The layout
 * turns it into rectangles; `input/hit-regions.ts` caches those.
 */

import { BLACK_KEY_OFFSETS, RANGE } from '../config/layout.ts';
import { madhyaSa, pitchClassOf } from '../music/pitch.ts';
import type { KeyId } from '../audio/voice-pool.ts';

/** C D E F G A B, as semitones above C. */
const NATURALS = [0, 2, 4, 5, 7, 9, 11];

/** Two octaves below A4 concert pitch — the left edge of the iPad keyboard. */
const C3 = -21;

export interface WhiteKey {
  id: KeyId;
  index: number;
}

export interface BlackKey {
  id: KeyId;
  /** Sits on the boundary after this white key's index. */
  afterWhiteIndex: number;
  /** Outward nudge from that boundary, in points (doc 02). */
  offset: number;
}

export interface KeyLayout {
  white: WhiteKey[];
  black: BlackKey[];
  lowest: KeyId;
  highest: KeyId;
}

export function isNatural(key: KeyId): boolean {
  return NATURALS.includes(pitchClassOf(key));
}

/** The first natural at or below a key — where a keyboard window can start. */
export function naturalAtOrBelow(key: KeyId): KeyId {
  let candidate = key;
  while (!isNatural(candidate)) candidate--;
  return candidate;
}

/**
 * Build the visible window: `whiteCount` white keys upward from `startKey`,
 * with the black keys that fall between them.
 */
export function buildKeyLayout(startKey: KeyId, whiteCount: number): KeyLayout {
  const white: WhiteKey[] = [];
  const black: BlackKey[] = [];

  let key = naturalAtOrBelow(startKey);
  const lowest = key;

  for (let index = 0; index < whiteCount; index++) {
    white.push({ id: key, index });

    // Step to the next natural, and pick up a black key if there is a gap.
    // Nothing is added after the last white key: a black key hanging off the
    // right-hand end would overflow the keyboard and belongs to the next
    // octave, which is not on screen.
    let next = key + 1;
    if (!isNatural(next)) {
      const offset = BLACK_KEY_OFFSETS[pitchClassOf(next)];
      if (offset !== undefined && index < whiteCount - 1) {
        black.push({ id: next, afterWhiteIndex: index, offset });
      }
      next += 1;
    }
    key = next;
  }

  const last = white[white.length - 1];
  return { white, black, lowest, highest: last ? last.id : lowest };
}

/**
 * The lowest visible key for the current window.
 *
 * Regular layouts show two octaves from C, which is what doc 02 draws. Compact
 * shows one octave from Sa, per doc 11 — starting at the natural at or below
 * Sa when Sa is a black key, since a window has to begin on a white key. The
 * shift moves the window by whole octaves and is clamped to the instrument's
 * range.
 */
export function windowStart(saPitchClass: number, octaveShift: number, fromSa: boolean, whiteCount: number): KeyId {
  // The iPad window starts at C3, so two octaves put madhya Sa under the hand
  // with room below it. The phone's single octave starts at madhya Sa itself.
  const base = fromSa ? naturalAtOrBelow(madhyaSa(saPitchClass)) : C3;
  const shifted = base + octaveShift * 12;
  const span = buildKeyLayout(shifted, whiteCount);
  const overshoot = span.highest - RANGE.highFromA4;
  if (overshoot > 0) return shifted - Math.ceil(overshoot / 12) * 12;
  if (shifted < RANGE.lowFromA4) return shifted + Math.ceil((RANGE.lowFromA4 - shifted) / 12) * 12;
  return shifted;
}
