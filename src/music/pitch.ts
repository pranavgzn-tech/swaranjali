/**
 * Frequency maths. All tuning is in cents and all pitch is a frequency —
 * no MIDI note number is ever the source of truth, because this instrument
 * has to support non-equal tuning (CLAUDE.md rule 5).
 *
 * A key's identity is its integer semitone distance from A4. Its *sound* is
 * that distance plus a cent offset, which is where shruti tuning, the attack
 * scoop and the pressure sharpening all apply.
 */

/** Concert A, adjustable 415–466 Hz so the user can tune to a recording. */
export const REFERENCE_A4_DEFAULT = 440;
export const REFERENCE_A4_MIN = 415;
export const REFERENCE_A4_MAX = 466;
export const REFERENCE_A4_STEP = 0.5;

/** A4 is 57 semitones above C0, which is what makes octave numbering work. */
const A4_ABOVE_C0 = 57;

const PITCH_CLASS_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;

/** Cents to a frequency ratio. */
export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

/** A frequency ratio back to cents. */
export function ratioToCents(ratio: number): number {
  return 1200 * Math.log2(ratio);
}

/**
 * The frequency of a key, in Hz.
 *
 * @param semitonesFromA4 the key's identity, an integer
 * @param cents any detune applied on top — tuning system, scoop, pressure
 * @param referenceA4 concert A for this session
 */
export function frequencyOf(semitonesFromA4: number, cents = 0, referenceA4 = REFERENCE_A4_DEFAULT): number {
  return referenceA4 * Math.pow(2, (semitonesFromA4 + cents / 100) / 12);
}

/** Pitch class 0–11 with C = 0. */
export function pitchClassOf(semitonesFromA4: number): number {
  return (((semitonesFromA4 + A4_ABOVE_C0) % 12) + 12) % 12;
}

/** Western octave number, so that A4 is in octave 4. */
export function octaveOf(semitonesFromA4: number): number {
  return Math.floor((semitonesFromA4 + A4_ABOVE_C0) / 12);
}

/** Western label for a key, e.g. 'C4' or 'F♯3'. */
export function westernLabel(semitonesFromA4: number): string {
  return `${PITCH_CLASS_NAMES[pitchClassOf(semitonesFromA4)]}${octaveOf(semitonesFromA4)}`;
}

/** Pitch class name alone, for the Sa selector. */
export function pitchClassName(pitchClass: number): string {
  return PITCH_CLASS_NAMES[((pitchClass % 12) + 12) % 12] ?? 'C';
}

/**
 * The key that sounds madhya Sa for a given Sa pitch class.
 *
 * Madhya saptak is anchored to octave 4 — Sa of C sounds C4, Sa of D sounds
 * D4 — which puts the middle register under the hand and matches where a
 * singer's Sa usually sits. See DECISIONS.md.
 */
export function madhyaSa(saPitchClass: number): number {
  return saPitchClass + 4 * 12 - A4_ABOVE_C0;
}
