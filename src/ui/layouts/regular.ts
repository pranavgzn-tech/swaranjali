/**
 * iPad three-band layout: pump top-left, stop mixer top-right, keyboard across
 * the full width beneath. Geometry from doc 02, band heights derived from the
 * real viewport per doc 12.
 */

import { deriveRegularBands, faderCentres, MIXER_DERIVED } from '../../config/derive.ts';
import { KEYBOARD, KEYBOARD_MODES, PUMP } from '../../config/layout.ts';
import { TYPE } from '../../config/theme.ts';
import { Keyboard } from '../keyboard.ts';
import { buildKeyLayout, windowStart } from '../keyboard-model.ts';
import { playableTaals } from '../../music/taal.ts';
import { Pump } from '../pump.ts';
import { StopMixer } from '../stop-mixer.ts';
import { TaalStrip } from '../taal-strip.ts';
import { Transport } from '../transport.ts';
import type { LayoutMount } from './layout.ts';

export const mountRegular: LayoutMount = (root, viewport, app) => {
  const settings = app.settings.current;
  const bands = deriveRegularBands(viewport.w, viewport.h);
  const mixerGeometry = MIXER_DERIVED(bands.topBandH);
  const mixerW = bands.stageW - PUMP.w;

  const mode = KEYBOARD_MODES[settings.keyboardMode];
  const whiteW = bands.stageW / mode.whiteCount;
  const start = windowStart(settings.sa, settings.octaveShift, false, mode.whiteCount);
  const keyLayout = buildKeyLayout(start, mode.whiteCount);

  const keyboardGeometry = {
    x: 0,
    y: bands.topBandH,
    w: bands.stageW,
    h: bands.keyboardH,
    whiteW,
    blackW: KEYBOARD.blackW,
    // Black keys stay at 62% of the white key length whatever the band height.
    blackH: Math.round(bands.keyboardH * (KEYBOARD.blackH / KEYBOARD.h)),
  };

  const keyboard = new Keyboard({
    layout: keyLayout,
    geometry: keyboardGeometry,
    sa: settings.sa,
    labelStyle: settings.labelStyle,
    showWesternSecondary: settings.showWesternSecondary,
    labelPosition: 'bottom',
    labelInset: KEYBOARD.labelFromBottom,
    westernInset: KEYBOARD.westernFromBottom,
    sargamSize: TYPE.sargam.size,
    westernSize: TYPE.western.size,
  });

  app.regions.rebuild(keyboardGeometry, keyLayout);
  app.setKeyboard(keyboard);

  const pump = new Pump({
    x: 0,
    y: 0,
    w: PUMP.w,
    h: PUMP.h,
    originY: viewport.insets.top,
    bellows: app.instrument.bellows,
    onRelease: () => app.instrument.pumpReleased(),
  });

  const transport = new Transport({
    x: 0,
    y: PUMP.h,
    w: PUMP.w,
    h: bands.topBandH - PUMP.h,
    sa: settings.sa,
    octaveShift: settings.octaveShift,
    onSaChange: (sa) => app.settings.update({ sa }),
    onOctaveChange: (octaveShift) => app.settings.update({ octaveShift }),
    onMenu: () => app.openSettings(),
  });

  const mixer = new StopMixer({
    x: PUMP.w,
    y: 0,
    w: mixerW,
    h: bands.topBandH,
    originY: viewport.insets.top,
    centres: faderCentres(mixerW),
    trackTop: mixerGeometry.trackTop,
    trackH: mixerGeometry.trackH,
    labelBaseline: mixerGeometry.labelBaseline,
    labelSize: TYPE.faderLabel.size,
    value: (id) => app.settings.current.faders[id],
    onChange: (id, value) => app.settings.setFader(id, value),
    onPanic: () => app.panic(),
  });

  // The taal strip lives in what is left of the mixer band below the fader
  // labels — on screen while playing, and clear of every key.
  const engine = app.instrument.taal;
  const startingTaal = engine.taal ?? playableTaals()[0];
  if (startingTaal && !engine.taal) engine.setTaal(startingTaal);

  const stripTop = mixerGeometry.labelBaseline + 18;
  const taalStrip = startingTaal
    ? new TaalStrip({
        x: PUMP.w,
        y: stripTop,
        w: mixerW,
        h: Math.max(0, bands.topBandH - stripTop),
        taal: startingTaal,
        bpm: engine.bpm,
        playing: engine.playing,
        onTaal: (taal) => engine.setTaal(taal),
        onPlay: () => engine.start(),
        onStop: () => engine.stop(),
        onBpm: (bpm) => engine.setBpm(bpm),
        onTap: () => engine.tap(),
        onRecord: () => app.toggleRecording(),
      })
    : null;

  // Light each beat when it sounds rather than when it is scheduled, so the
  // counter agrees with the ear.
  const unwatch = taalStrip
    ? engine.scheduled.on((event) => {
        taalStrip.setBpm(engine.bpm);
        taalStrip.showMatra(event, event.atTime - app.instrument.clock.now);
      })
    : () => {};

  const stage = document.createElement('div');
  stage.className = 'instrument';
  stage.append(pump.element, transport.element, mixer.element, keyboard.element);
  if (taalStrip) stage.append(taalStrip.element);
  root.appendChild(stage);

  const detachPointer = app.router.attach(keyboard.element, {
    x: viewport.insets.left,
    y: viewport.insets.top,
  });

  return () => {
    unwatch();
    taalStrip?.destroy();
    detachPointer();
    app.setKeyboard(null);
    keyboard.destroy();
    pump.destroy();
    transport.destroy();
    mixer.destroy();
    stage.remove();
  };
};
