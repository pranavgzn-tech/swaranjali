/**
 * Companion mode. The phone in portrait is not a playable harmonium, so there
 * is deliberately no keyboard here (doc 11).
 *
 * What it is instead is a shruti box and lehra — the thing a musician props
 * next to themselves while practising. That makes the phone useful on its own,
 * with no harmonium involved at all.
 */

import { COMPACT_PORTRAIT } from '../../config/compact.ts';
import { regionStage, type Region } from '../region-box.ts';
import type { LayoutMount } from './layout.ts';

export const mountCompactPortrait: LayoutMount = (root, viewport) => {
  const { headerH, saDialSize, rowH, taalH, notationMinH, footerH, rotateHintH } = COMPACT_PORTRAIT;

  const fixed = headerH + saDialSize + rowH * 2 + taalH + footerH + rotateHintH;
  // Notation takes whatever is left; everything else keeps its size.
  const notationH = Math.max(notationMinH, viewport.h - fixed);

  let y = 0;
  const band = (name: string, h: number, note?: string, tone?: Region['tone']): Region => {
    const region: Region = { name, x: 0, y, w: viewport.w, h, ...(note !== undefined ? { note } : {}), ...(tone !== undefined ? { tone } : {}) };
    y += h;
    return region;
  };

  const regions: Region[] = [
    band('Header', headerH, 'Sa · reference A4'),
    band('Sa dial', saDialSize, 'large, draggable', 'brass'),
    band('Drone', rowH),
    band('Tanpura', rowH),
    band('Taal', taalH, 'matra dots, sam × and khali 0'),
    band('Notation', notationH, 'scrolls when a composition is open', 'ivory'),
    band('Record · Tuner', footerH),
    band('Rotate to play', rotateHintH),
  ];

  const stage = regionStage(regions);

  const readout = document.createElement('div');
  readout.className = 'readout readout--compact';
  readout.textContent = [
    `compact-portrait · stage ${viewport.w} × ${viewport.h}`,
    `insets t${viewport.insets.top} r${viewport.insets.right} b${viewport.insets.bottom} l${viewport.insets.left}`,
    `bands ${y} · ${viewport.h - y} spare`,
  ].join('   ');
  stage.appendChild(readout);

  root.appendChild(stage);
  return () => stage.remove();
};
