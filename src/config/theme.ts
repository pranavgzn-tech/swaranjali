/**
 * Design tokens mirrored from src/styles/tokens.css, for the places that need
 * a colour in TypeScript rather than CSS — the generated icons and launch
 * screens, and the reservoir light. If you change one, change both.
 */

export const PALETTE = {
  woodDeep: '#2A1A12',
  woodBody: '#4A2E1D',
  woodLit: '#6B452C',
  brass: '#B8874A',
  brassBright: '#E0AE6B',
  ivory: '#EDE4D2',
  ivoryDim: '#C9BCA4',
  ebony: '#171310',
  cloth: '#4A1F2B',
  ink: '#1A1512',
  inkSoft: '#8C7A63',
  paper: '#E8DCC4',
} as const;

/** Type scale in points, doc 06. Compact overrides live in config/compact.ts. */
export const TYPE = {
  sargam: { size: 26, weight: 600 },
  western: { size: 15, weight: 400 },
  faderLabel: { size: 13, weight: 600, tracking: 0.08, uppercase: true },
  panelHeading: { size: 21, weight: 600 },
  body: { size: 16, weight: 400 },
  matra: { size: 32, weight: 600, tabular: true },
} as const;

export const MOTION = {
  keyPressMs: 60,
  keyPressEase: 'cubic-bezier(.2,.8,.3,1)',
  panelMs: 180,
  soundingFadeMs: 40,
  idleAfterMs: 45_000, // the instrument rests after 45 s untouched, doc 06
} as const;
