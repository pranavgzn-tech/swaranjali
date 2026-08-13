/**
 * Band heights derived from the real viewport, per
 * docs/12-install-fullscreen-offline.md.
 *
 * The constants in config/layout.ts are the reference values at a zero top
 * inset. Installed to the home screen the iPad reports a status-bar inset and
 * the nominal 820 pt of height is no longer all ours, so nothing may hard-code
 * a band height — it is derived here and only here.
 */

import { KEYBOARD, KEYBOARD_H_FLOOR, MIXER, PUMP, TOUCH } from './layout.ts';

export interface RegularBands {
  stageW: number;
  stageH: number;
  keyboardH: number;
  topBandH: number;
  /** True when the keyboard had to give up height to protect the pump. */
  keyboardReduced: boolean;
}

/**
 * The mixer's internal geometry as ratios of the 300 pt reference band, so it
 * scales with whatever height the band actually gets.
 */
export const MIXER_DERIVED = (topBandH: number) => ({
  trackTop: Math.round(topBandH * 0.173),
  trackH: Math.round(topBandH * 0.56),
  labelBaseline: Math.round(topBandH * 0.813),
});

/**
 * The top band cannot go below the pump paddle's minimum plus one row of
 * 44 pt controls beneath it. Doc 02 is firm that 300 × 230 is the floor for
 * the paddle: the left hand rests there for a whole session.
 */
const MIN_TOP_BAND = PUMP.h + TOUCH.minButton;

/** Derive the iPad three-band layout from the usable stage, insets removed. */
export function deriveRegularBands(stageW: number, stageH: number): RegularBands {
  let keyboardH: number = KEYBOARD.h;
  let topBandH = stageH - keyboardH;

  if (topBandH < MIN_TOP_BAND) {
    // Protect the pump and the fader caps by taking the height out of the
    // keyboard instead, down to the floor in doc 12.
    keyboardH = Math.max(KEYBOARD_H_FLOOR, stageH - MIN_TOP_BAND);
    topBandH = stageH - keyboardH;
  }

  return {
    stageW,
    stageH,
    keyboardH,
    topBandH,
    keyboardReduced: keyboardH < KEYBOARD.h,
  };
}

/**
 * Fader cap positions across the mixer band. The master fader sits after an
 * extra gap so a thumb never grabs it by accident.
 */
export function faderCentres(mixerW: number): number[] {
  const count = MIXER.faderCount;
  // Distance from the first cap's centre to the master's, including the gap.
  const centreSpan = (count - 1) * MIXER.faderPitch + MIXER.masterGapBefore;
  // Centre the caps, not the centres: the outermost caps are what can overflow.
  const first = Math.max(MIXER.capW / 2, (mixerW - centreSpan - MIXER.capW) / 2 + MIXER.capW / 2);

  const centres: number[] = [];
  for (let i = 0; i < count; i++) {
    const isMaster = i === count - 1;
    centres.push(first + i * MIXER.faderPitch + (isMaster ? MIXER.masterGapBefore : 0));
  }
  return centres;
}
