/**
 * Phone instrument layout: top bar, keyboard, full-width pump strip. Doc 11.
 *
 * Exactly eight white keys, always — one octave, Sa to Sa. Every target phone
 * lands within a millimetre or two of the iPad's key size that way, so muscle
 * memory transfers between the two devices. The key count is not configurable
 * here and must not become so.
 *
 * Three things differ from the iPad on purpose: labels sit at the top of the
 * key because fingers cover the bottom half of a 250 pt key; the pump is a
 * strip the thumb can hit anywhere; and the stops live in a pull-down sheet
 * that keeps the pump live underneath, so air does not drain while you adjust.
 */

import { COMPACT_KEYBOARD_H, COMPACT_LANDSCAPE, COMPACT_TYPE } from '../../config/compact.ts';
import { TOUCH } from '../../config/layout.ts';
import { Keyboard } from '../keyboard.ts';
import { buildKeyLayout, windowStart } from '../keyboard-model.ts';
import { Pump } from '../pump.ts';
import { StopsSheet } from '../stops-sheet.ts';
import { Transport } from '../transport.ts';
import type { LayoutMount } from './layout.ts';

function keyboardHeight(usableH: number): number {
  const wanted = usableH - COMPACT_KEYBOARD_H.reservedForBands;
  return Math.round(Math.min(COMPACT_KEYBOARD_H.max, Math.max(COMPACT_KEYBOARD_H.min, wanted)));
}

export const mountCompactLandscape: LayoutMount = (root, viewport, app) => {
  const settings = app.settings.current;
  const { topBarH, pumpH, whiteCount, blackW, blackH, labelFromTop, westernFromTop } = COMPACT_LANDSCAPE;

  const keyboardH = keyboardHeight(viewport.h);
  const whiteW = viewport.w / whiteCount;
  // Whatever is left over goes to the pump, which is the forgiving target.
  const pumpTop = topBarH + keyboardH;
  const pumpHeight = Math.max(pumpH, viewport.h - pumpTop);

  const start = windowStart(settings.sa, settings.octaveShift, true, whiteCount);
  const keyLayout = buildKeyLayout(start, whiteCount);

  const geometry = {
    x: 0,
    y: topBarH,
    w: viewport.w,
    h: keyboardH,
    whiteW,
    blackW: whiteW * blackW,
    blackH: keyboardH * blackH,
  };

  const keyboard = new Keyboard({
    layout: keyLayout,
    geometry,
    sa: settings.sa,
    labelStyle: settings.labelStyle,
    showWesternSecondary: settings.showWesternSecondary,
    labelPosition: 'top',
    labelInset: labelFromTop,
    westernInset: westernFromTop,
    sargamSize: COMPACT_TYPE.sargam,
    westernSize: COMPACT_TYPE.western,
  });

  app.regions.rebuild(geometry, keyLayout);
  app.setKeyboard(keyboard);

  const pump = new Pump({
    x: 0,
    y: pumpTop,
    w: viewport.w,
    h: pumpHeight,
    originY: viewport.insets.top,
    bellows: app.instrument.bellows,
    onRelease: () => app.instrument.pumpReleased(),
  });

  const sheet = new StopsSheet({
    stageW: viewport.w,
    stageH: viewport.h,
    originY: viewport.insets.top,
    coverage: COMPACT_LANDSCAPE.sheetCoverage,
    value: (id) => app.settings.current.faders[id],
    onChange: (id, value) => app.settings.setFader(id, value),
  });

  const transport = new Transport({
    x: 0,
    y: 0,
    w: viewport.w,
    h: Math.max(topBarH, TOUCH.minButton),
    sa: settings.sa,
    octaveShift: settings.octaveShift,
    onSaChange: (sa) => app.settings.update({ sa }),
    onOctaveChange: (octaveShift) => app.settings.update({ octaveShift }),
    onMenu: () => app.openSettings(),
  });
  transport.element.classList.add('transport--compact');

  const stops = document.createElement('button');
  stops.type = 'button';
  stops.className = 'transport__button transport__stops';
  stops.textContent = 'Stops';
  stops.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    sheet.toggle();
  });
  transport.element.appendChild(stops);

  const stage = document.createElement('div');
  stage.className = 'instrument';
  stage.append(transport.element, keyboard.element, pump.element, sheet.element);
  root.appendChild(stage);

  const detachPointer = app.router.attach(keyboard.element, {
    x: viewport.insets.left,
    y: viewport.insets.top,
  });

  return () => {
    detachPointer();
    app.setKeyboard(null);
    keyboard.destroy();
    pump.destroy();
    transport.destroy();
    sheet.destroy();
    stage.remove();
  };
};
