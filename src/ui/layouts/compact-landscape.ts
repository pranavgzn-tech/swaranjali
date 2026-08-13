/**
 * Phone instrument layout: top bar, keyboard, full-width pump strip. Doc 11.
 *
 * Exactly eight white keys, always — one octave, Sa to Sa. Every target phone
 * lands within a millimetre or two of the iPad's key size that way, so muscle
 * memory transfers between the two devices. The key count is not configurable
 * here and must not become so.
 */

import { COMPACT_KEYBOARD_H, COMPACT_LANDSCAPE } from '../../config/compact.ts';
import { regionStage, type Region } from '../region-box.ts';
import type { LayoutMount } from './layout.ts';

/** Doc 11: clamp(210, usableH − 122, 290). */
function keyboardHeight(usableH: number): number {
  const wanted = usableH - COMPACT_KEYBOARD_H.reservedForBands;
  return Math.round(Math.min(COMPACT_KEYBOARD_H.max, Math.max(COMPACT_KEYBOARD_H.min, wanted)));
}

export const mountCompactLandscape: LayoutMount = (root, viewport) => {
  const { topBarH, pumpH, whiteCount, blackW, blackH, labelFromTop } = COMPACT_LANDSCAPE;
  const keyboardH = keyboardHeight(viewport.h);
  const whiteW = viewport.w / whiteCount;
  const overflow = viewport.h - (topBarH + keyboardH + pumpH);

  const regions: Region[] = [
    {
      name: 'Top bar',
      x: 0,
      y: 0,
      w: viewport.w,
      h: topBarH,
      note: 'menu · Sa · oct − + · stops · air',
    },
    {
      name: 'Keyboard',
      x: 0,
      y: topBarH,
      w: viewport.w,
      h: keyboardH,
      tone: 'ivory',
      note: `${whiteCount} white at ${whiteW.toFixed(1)} pt · black ${(whiteW * blackW).toFixed(0)} × ${(keyboardH * blackH).toFixed(0)} · labels ${labelFromTop} from top`,
    },
    {
      name: 'Pump',
      x: 0,
      y: topBarH + keyboardH,
      w: viewport.w,
      h: pumpH,
      tone: 'cloth',
      note: 'full-width strip, clear of the home indicator',
    },
  ];

  const stage = regionStage(regions);

  const readout = document.createElement('div');
  readout.className = 'readout readout--compact';
  readout.textContent = [
    `compact-landscape · stage ${viewport.w} × ${viewport.h}`,
    `insets t${viewport.insets.top} r${viewport.insets.right} b${viewport.insets.bottom} l${viewport.insets.left}`,
    `${topBarH} + ${keyboardH} + ${pumpH} = ${topBarH + keyboardH + pumpH}`,
    overflow === 0 ? 'exact fit' : `${overflow > 0 ? '+' : ''}${overflow} spare`,
  ].join('   ');
  stage.appendChild(readout);

  root.appendChild(stage);
  return () => stage.remove();
};
