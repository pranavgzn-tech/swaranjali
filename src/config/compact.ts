/**
 * iPhone geometry, from docs/11-responsive-layouts.md. This is not a scaled
 * iPad layout and must not be made into one.
 */

export const COMPACT_LANDSCAPE = {
  topBarH: 44,
  keyboardH: 250, // scale to fit: clamp(210, usableH - 122, 290)
  pumpH: 78,
  whiteCount: 8, // fixed — never configurable on phone
  blackW: 0.56, // fraction of white key width
  blackH: 0.62, // fraction of keyboard height
  labelFromTop: 26, // sargam baseline, measured from the top of the key
  westernFromTop: 48,
  sheetCoverage: 0.66, // stops sheet height as fraction of usable height
} as const;

/** Doc 11 gives these as the clamp bounds for the keyboard band. */
export const COMPACT_KEYBOARD_H = { min: 210, max: 290, reservedForBands: 122 } as const;

/** Type scale drops on compact — doc 11. */
export const COMPACT_TYPE = {
  sargam: 19,
  western: 11,
  faderLabel: 11,
} as const;

/**
 * Compact portrait is companion mode: a shruti box and lehra, with no
 * keyboard at all. Doc 11 is explicit that rendering a half-keyboard here
 * produces a bad instrument, so these are the only regions.
 */
export const COMPACT_PORTRAIT = {
  headerH: 44,
  saDialSize: 168,
  rowH: 56, // drone / tanpura fader rows
  taalH: 96,
  notationMinH: 120,
  footerH: 64, // record and tuner
  rotateHintH: 28,
} as const;
