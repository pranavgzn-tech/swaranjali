/**
 * iPad three-band layout: pump top-left, stop mixer top-right, keyboard across
 * the full width beneath. Geometry from doc 02, band heights derived from the
 * real viewport per doc 12.
 *
 * Phase 0 draws region boxes. Phase 1 replaces each box with its component;
 * the geometry maths here does not change.
 */

import { deriveRegularBands, faderCentres, MIXER_DERIVED } from '../../config/derive.ts';
import { KEYBOARD_MODES, MIXER, PUMP, PUMP_CONTROLS } from '../../config/layout.ts';
import { regionStage, type Region } from '../region-box.ts';
import type { LayoutMount } from './layout.ts';

export const mountRegular: LayoutMount = (root, viewport) => {
  const bands = deriveRegularBands(viewport.w, viewport.h);
  const mixer = MIXER_DERIVED(bands.topBandH);
  const mixerW = bands.stageW - PUMP.w;
  const keys = KEYBOARD_MODES.standard;
  const whiteW = bands.stageW / keys.whiteCount;

  // The pump band holds the paddle plus its control row; the paddle keeps its
  // 230 pt minimum and the controls take whatever is left.
  const paddleH = PUMP.h;
  const controlsH = bands.topBandH - paddleH;

  const regions: Region[] = [
    {
      name: 'Pump',
      x: 0,
      y: 0,
      w: PUMP.w,
      h: paddleH,
      tone: 'cloth',
      note: `paddle ${PUMP.w} × ${paddleH}, travel ${PUMP.travel}`,
    },
    {
      name: 'Pump controls',
      x: 0,
      y: paddleH,
      w: PUMP_CONTROLS.w,
      h: controlsH,
      note: 'oct − / Sa / oct + / menu',
    },
    {
      name: 'Stop mixer',
      x: PUMP.w,
      y: 0,
      w: mixerW,
      h: bands.topBandH,
      tone: 'brass',
      note: `${MIXER.faderCount} faders · track ${mixer.trackH} from ${mixer.trackTop} · labels ${mixer.labelBaseline}`,
    },
    {
      name: 'Keyboard',
      x: 0,
      y: bands.topBandH,
      w: bands.stageW,
      h: bands.keyboardH,
      tone: 'ivory',
      note: `${keys.whiteCount} white keys at ${whiteW.toFixed(1)} pt ≈ ${keys.mm} mm`,
    },
  ];

  const stage = regionStage(regions);

  // Fader centres drawn as ticks, so the master gap is visible on the device.
  for (const centre of faderCentres(mixerW)) {
    const tick = document.createElement('div');
    tick.className = 'tick';
    tick.style.left = `${PUMP.w + centre}px`;
    tick.style.top = `${mixer.trackTop}px`;
    tick.style.height = `${mixer.trackH}px`;
    stage.appendChild(tick);
  }

  const readout = document.createElement('div');
  readout.className = 'readout';
  readout.textContent = [
    `regular · stage ${bands.stageW} × ${bands.stageH}`,
    `insets t${viewport.insets.top} r${viewport.insets.right} b${viewport.insets.bottom} l${viewport.insets.left}`,
    `top band ${bands.topBandH} · keyboard ${bands.keyboardH}${bands.keyboardReduced ? ' (reduced)' : ''}`,
  ].join('   ');
  stage.appendChild(readout);

  root.appendChild(stage);
  return () => stage.remove();
};
