/**
 * Sargam naming: which swara a key is, in which register, and how to write it.
 *
 * Everything here is relative to the chosen Sa. That relativity is what makes
 * this an Indian instrument rather than a keyboard with a reed sound.
 */

import { madhyaSa } from './pitch.ts';

/** Semitones above Sa, 0–11. Sa = 0, komal Re = 1, … Ni = 11. */
export type Degree = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Octave register relative to the chosen Sa. */
export type Saptak = 'mandra' | 'madhya' | 'taar';

export type LabelStyle = 'hindustani' | 'carnatic' | 'devanagari' | 'western';

export interface SwaraName {
  hindustani: string;
  carnatic: string;
  devanagari: string;
  komal: boolean;
  tivra: boolean;
}

/**
 * The twelve swaras. Carnatic names use the defaults from doc 04 where a pitch
 * is shared between two names: R3/G1 and D3/N1 both exist at 3 and 8
 * semitones, and without melakarta context the first of each pair is right.
 */
export const SWARA_NAMES: readonly SwaraName[] = [
  { hindustani: 'S', carnatic: 'S', devanagari: 'सा', komal: false, tivra: false },
  { hindustani: 'r', carnatic: 'R1', devanagari: 'रे', komal: true, tivra: false },
  { hindustani: 'R', carnatic: 'R2', devanagari: 'रे', komal: false, tivra: false },
  { hindustani: 'g', carnatic: 'G2', devanagari: 'ग', komal: true, tivra: false },
  { hindustani: 'G', carnatic: 'G3', devanagari: 'ग', komal: false, tivra: false },
  { hindustani: 'm', carnatic: 'M1', devanagari: 'म', komal: false, tivra: false },
  { hindustani: 'M', carnatic: 'M2', devanagari: 'म', komal: false, tivra: true },
  { hindustani: 'P', carnatic: 'P', devanagari: 'प', komal: false, tivra: false },
  { hindustani: 'd', carnatic: 'D1', devanagari: 'ध', komal: true, tivra: false },
  { hindustani: 'D', carnatic: 'D2', devanagari: 'ध', komal: false, tivra: false },
  { hindustani: 'n', carnatic: 'N2', devanagari: 'नि', komal: true, tivra: false },
  { hindustani: 'N', carnatic: 'N3', devanagari: 'नि', komal: false, tivra: false },
];

/** Which swara a key is, given where Sa is. */
export function degreeOf(semitonesFromA4: number, saPitchClass: number): Degree {
  const fromSa = semitonesFromA4 - madhyaSa(saPitchClass);
  return ((((fromSa % 12) + 12) % 12) as Degree);
}

/**
 * Which register a key falls in. Anything more than an octave below madhya Sa
 * is still drawn as mandra: the instrument's range does not reach ati-mandra,
 * and a second dot would only add clutter.
 */
export function saptakOf(semitonesFromA4: number, saPitchClass: number): Saptak {
  const fromSa = semitonesFromA4 - madhyaSa(saPitchClass);
  if (fromSa < 0) return 'mandra';
  if (fromSa >= 12) return 'taar';
  return 'madhya';
}

/** The primary label for a key in the chosen style, without the register dot. */
export function swaraLabel(degree: Degree, style: Exclude<LabelStyle, 'western'>): string {
  const name = SWARA_NAMES[degree];
  if (!name) return '';
  switch (style) {
    case 'hindustani':
      return name.hindustani;
    case 'carnatic':
      return name.carnatic;
    case 'devanagari':
      return name.devanagari;
  }
}

/** True when the swara is written with an underline (Bhatkhande's komal mark). */
export function isKomal(degree: Degree): boolean {
  return SWARA_NAMES[degree]?.komal ?? false;
}

/** True for tivra Ma, which is written with a short vertical line above. */
export function isTivra(degree: Degree): boolean {
  return SWARA_NAMES[degree]?.tivra ?? false;
}
