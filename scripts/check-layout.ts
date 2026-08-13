/**
 * Asserts the layout geometry at every target viewport, using the same
 * functions the app uses at runtime.
 *
 * The definition of done in CLAUDE.md requires reasoning through 1180 × 820,
 * 852 × 393 and 393 × 852 and confirming nothing overflows, overlaps, or hides
 * under a safe-area inset. This does that arithmetically on every build, at
 * the real inset values rather than the nominal ones, so a constant that stops
 * fitting fails the build instead of surfacing on the device.
 */

import { COMPACT_KEYBOARD_H, COMPACT_LANDSCAPE, COMPACT_PORTRAIT } from '../src/config/compact.ts';
import { deriveRegularBands, faderCentres, MIXER_DERIVED } from '../src/config/derive.ts';
import { KEYBOARD_H_FLOOR, KEYBOARD_MODES, MIXER, PUMP, TOUCH } from '../src/config/layout.ts';
import { sizeClass } from '../src/ui/size-class.ts';

interface Case {
  name: string;
  raw: [w: number, h: number];
  /** top, right, bottom, left — the insets iOS reports for that device. */
  insets: [number, number, number, number];
}

const CASES: Case[] = [
  { name: 'iPad Air 10.9" landscape, in Safari', raw: [1180, 820], insets: [0, 0, 0, 0] },
  { name: 'iPad Air 10.9" landscape, installed', raw: [1180, 820], insets: [24, 0, 20, 0] },
  { name: 'iPad Air 10.9" portrait', raw: [820, 1180], insets: [24, 0, 20, 0] },
  { name: 'iPad Split View, half width', raw: [507, 820], insets: [24, 0, 20, 0] },
  { name: 'iPad Slide Over', raw: [320, 820], insets: [24, 0, 20, 0] },
  { name: 'iPhone 15/16 landscape, island left', raw: [852, 393], insets: [0, 0, 21, 59] },
  { name: 'iPhone 15/16 landscape, island right', raw: [852, 393], insets: [0, 59, 21, 0] },
  { name: 'iPhone SE landscape', raw: [667, 375], insets: [0, 0, 0, 0] },
  { name: 'iPhone 16 Pro Max landscape', raw: [956, 440], insets: [0, 62, 21, 62] },
  { name: 'iPhone 15/16 portrait', raw: [393, 852], insets: [59, 0, 34, 0] },
];

let failures = 0;

function check(condition: boolean, message: string): void {
  if (condition) return;
  failures++;
  process.stdout.write(`  FAIL  ${message}\n`);
}

for (const testCase of CASES) {
  const [rawW, rawH] = testCase.raw;
  const [top, right, bottom, left] = testCase.insets;
  const w = rawW - left - right;
  const h = rawH - top - bottom;
  const cls = sizeClass(w, h);
  const tabletPortrait = cls === 'compact-portrait' && w >= 700;

  process.stdout.write(`${testCase.name}: stage ${w} × ${h} -> ${tabletPortrait ? 'rotate message' : cls}\n`);

  if (cls === 'regular') {
    const bands = deriveRegularBands(w, h);
    const mixer = MIXER_DERIVED(bands.topBandH);
    const mixerW = bands.stageW - PUMP.w;
    const centres = faderCentres(mixerW);
    const firstCentre = centres[0] ?? 0;
    const lastCentre = centres[centres.length - 1] ?? 0;
    const whiteW = bands.stageW / KEYBOARD_MODES.standard.whiteCount;

    check(bands.topBandH + bands.keyboardH === h, 'bands do not sum to the stage height');
    check(bands.topBandH >= PUMP.h + TOUCH.minButton, `top band ${bands.topBandH} cannot hold the paddle plus a control row`);
    check(bands.keyboardH >= KEYBOARD_H_FLOOR, `keyboard ${bands.keyboardH} is below the ${KEYBOARD_H_FLOOR} floor`);
    check(mixer.trackTop + mixer.trackH + MIXER.capH / 2 <= bands.topBandH, 'fader track and cap overflow the mixer band');
    check(mixer.labelBaseline <= bands.topBandH, 'fader labels fall outside the mixer band');
    check(firstCentre - MIXER.capW / 2 >= 0, 'the first fader cap overflows the left edge');
    check(lastCentre + MIXER.capW / 2 <= mixerW, 'the master fader cap overflows the right edge');
    check(whiteW > 0, 'white key width is not positive');
  }

  if (cls === 'compact-landscape') {
    const wanted = h - COMPACT_KEYBOARD_H.reservedForBands;
    const keyboardH = Math.round(Math.min(COMPACT_KEYBOARD_H.max, Math.max(COMPACT_KEYBOARD_H.min, wanted)));
    const total = COMPACT_LANDSCAPE.topBarH + keyboardH + COMPACT_LANDSCAPE.pumpH;

    check(total <= h, `bands total ${total} overflow the stage height ${h}`);
    check(COMPACT_LANDSCAPE.pumpH >= TOUCH.minButton, 'the pump strip is below the minimum touch height');
    check(COMPACT_LANDSCAPE.topBarH >= TOUCH.minButton, 'the top bar is below the minimum touch height');
    check(w / COMPACT_LANDSCAPE.whiteCount >= 60, 'white keys are too narrow to play');
  }

  if (cls === 'compact-portrait' && !tabletPortrait) {
    const p = COMPACT_PORTRAIT;
    const fixed = p.headerH + p.saDialSize + p.rowH * 2 + p.taalH + p.footerH + p.rotateHintH;
    const total = fixed + Math.max(p.notationMinH, h - fixed);

    check(total <= h, `companion bands total ${total} overflow the stage height ${h}`);
  }
}

if (failures > 0) {
  process.stdout.write(`\n${failures} layout check${failures === 1 ? '' : 's'} failed\n`);
  process.exit(1);
}

process.stdout.write(`\nLayout checks passed at ${CASES.length} viewports\n`);
