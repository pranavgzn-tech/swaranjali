/**
 * iPad (Regular size class) geometry. Every value here comes from
 * docs/02-ipad-layout.md and is in CSS points.
 *
 * These are the reference values at a zero top inset. Once installed to the
 * home screen the iPad reports a status-bar inset and the top band shrinks, so
 * the mixer's internal geometry is derived at runtime — see config/derive.ts
 * and docs/12-install-fullscreen-offline.md. Nothing outside this file should
 * hard-code a band height.
 */

export const SCREEN = { w: 1180, h: 820 } as const;

export const PUMP = {
  x: 0,
  y: 0,
  w: 300,
  h: 230,
  cornerRadius: 18,
  travel: 26, // pt the paddle visually depresses
} as const;

export const PUMP_CONTROLS = { x: 0, y: 230, w: 300, h: 70 } as const;

export const MIXER = {
  x: 300,
  y: 0,
  w: 880,
  h: 300,
  faderCount: 10, // 9 stops + master
  faderPitch: 88, // pt between fader centres
  trackW: 10,
  trackH: 168,
  trackTop: 52, // y offset within the mixer band
  capW: 62, // fader cap — must be an easy thumb target
  capH: 34,
  labelBaseline: 244,
  masterGapBefore: 14, // extra separation before the master fader
} as const;

export const KEYBOARD = {
  x: 0,
  y: 300,
  w: 1180,
  h: 520,
  whiteCount: 15, // Standard mode
  whiteW: 78.666, // 1180 / 15
  whiteH: 520,
  blackW: 46,
  blackH: 322, // 62% of white
  labelFromBottom: 46, // sargam baseline
  westernFromBottom: 22,
} as const;

/**
 * The three keyboard widths offered in settings. Doc 02 sizes these against a
 * real harmonium white key of 21 mm; on a 264 ppi iPad, 1 pt ≈ 0.192 mm.
 * Wide is the one that matches a real instrument most closely, and the
 * settings copy says so.
 */
export const KEYBOARD_MODES = {
  wide: { whiteCount: 11, whiteW: 1180 / 11, mm: 20.6 },
  standard: { whiteCount: 15, whiteW: 1180 / 15, mm: 15.1 },
  compact: { whiteCount: 18, whiteW: 1180 / 18, mm: 12.6 },
} as const;

export type KeyboardMode = keyof typeof KEYBOARD_MODES;

/**
 * Black keys are centred on the boundary between the white keys they sit
 * between, offset outward the way a real keyboard does it. Keyed by semitone
 * degree above C. Doc 02.
 */
export const BLACK_KEY_OFFSETS: Readonly<Record<number, number>> = {
  1: -6, // C# / komal Re
  3: +6, // D# / komal Ga
  6: -8, // F# / tivra Ma
  8: 0, // G# / komal Dha
  10: +8, // A# / komal Ni
};

/**
 * Full instrument range, doc 02: F2 to C6.
 *
 * Expressed as semitones from A4 so no MIDI note number is ever the source of
 * truth for pitch (CLAUDE.md rule 5). F2 is 27 semitones below A4; C6 is 15
 * above. Note that F2–C6 inclusive is 44 keys, not the 42 the doc's prose
 * claims — see DECISIONS.md.
 */
export const RANGE = { lowFromA4: -27, highFromA4: 15 } as const;

/** Minimum hit sizes, doc 02. Nothing tappable is allowed below these. */
export const TOUCH = {
  minButton: 44, // pt, every small button's hit area
  faderHitPadding: 20, // invisible padding on every side of a fader cap
  keyboardBottomKeepClear: 20, // home indicator strip, doc 02
} as const;

/** Below this derived keyboard height, shrink nothing further — doc 12. */
export const KEYBOARD_H_FLOOR = 460;
