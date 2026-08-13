/**
 * Taals — the rhythmic cycles.
 *
 * A taal is a repeating cycle of beats (*matras*) grouped into sections
 * (*vibhag*). The first beat of the cycle is *sam*, written ×, and it is the
 * point everything resolves to. Some sections are marked with a clap (*tali*)
 * and one is marked with a wave of the empty hand (*khali*, written 0) — the
 * khali section is where the drum plays its quieter, open strokes, which is
 * how you hear where you are in the cycle without counting.
 *
 * The syllables (*bols*) are the drum strokes, one entry per matra. A single
 * matra can hold a compound stroke like "Dhage", which is why the bol strings
 * are not all one syllable.
 *
 * Structure from doc 04. Bols are traditional theka patterns; the ones I could
 * not vouch for are marked `verified: false` and are not offered in the UI,
 * following the same rule doc 04 sets for ragas — a wrong one is worse than a
 * missing one.
 */

export interface Taal {
  id: string;
  name: string;
  tradition: 'hindustani' | 'carnatic' | 'light';
  matras: number;
  /** Section lengths; must sum to matras. */
  vibhag: number[];
  /** 1-indexed matra of sam. */
  sam: number;
  /** 1-indexed matras that are clapped. */
  tali: number[];
  /** 1-indexed matras that are waved. */
  khali: number[];
  /** One per matra. '-' is a rest, where the previous stroke rings on. */
  bols: string[];
  defaultBpm: number;
  /** Shown at the top of the list. */
  common: boolean;
  /** False means the pattern needs checking and is hidden. */
  verified: boolean;
}

/**
 * Keherwa, Dadra and Bhajani come first: doc 04 says these are the ones a
 * bhajan singer needs most, and this app is for devotional practice.
 */
export const TAALS: readonly Taal[] = [
  {
    id: 'keherwa',
    name: 'Keherwa',
    tradition: 'light',
    matras: 8,
    vibhag: [4, 4],
    sam: 1,
    tali: [1],
    khali: [5],
    bols: ['Dha', 'Ge', 'Na', 'Ti', 'Na', 'Ka', 'Dhi', 'Na'],
    defaultBpm: 80,
    common: true,
    verified: true,
  },
  {
    id: 'dadra',
    name: 'Dadra',
    tradition: 'light',
    matras: 6,
    vibhag: [3, 3],
    sam: 1,
    tali: [1],
    khali: [4],
    bols: ['Dha', 'Dhin', 'Na', 'Dha', 'Tin', 'Na'],
    defaultBpm: 90,
    common: true,
    verified: true,
  },
  {
    id: 'bhajani',
    name: 'Bhajani',
    tradition: 'light',
    matras: 8,
    vibhag: [4, 4],
    sam: 1,
    tali: [1],
    khali: [5],
    // Bhajani theka varies by region and singer more than most. Held back
    // rather than shipped as though it were settled.
    bols: ['Dhin', 'Na', 'Dhin', 'Dhin', 'Na', 'Tin', 'Na', 'Dhin'],
    defaultBpm: 90,
    common: true,
    verified: false,
  },
  {
    id: 'teentaal',
    name: 'Teentaal',
    tradition: 'hindustani',
    matras: 16,
    vibhag: [4, 4, 4, 4],
    sam: 1,
    tali: [1, 5, 13],
    khali: [9],
    bols: [
      'Dha', 'Dhin', 'Dhin', 'Dha',
      'Dha', 'Dhin', 'Dhin', 'Dha',
      'Dha', 'Tin', 'Tin', 'Ta',
      'Ta', 'Dhin', 'Dhin', 'Dha',
    ],
    defaultBpm: 80,
    common: true,
    verified: true,
  },
  {
    id: 'jhaptaal',
    name: 'Jhaptaal',
    tradition: 'hindustani',
    matras: 10,
    vibhag: [2, 3, 2, 3],
    sam: 1,
    tali: [1, 3, 8],
    khali: [6],
    bols: ['Dhi', 'Na', 'Dhi', 'Dhi', 'Na', 'Ti', 'Na', 'Dhi', 'Dhi', 'Na'],
    defaultBpm: 70,
    common: false,
    verified: true,
  },
  {
    id: 'rupak',
    name: 'Rupak',
    tradition: 'hindustani',
    matras: 7,
    vibhag: [3, 2, 2],
    // Rupak is unusual: the cycle begins on khali rather than on a clap.
    sam: 1,
    tali: [4, 6],
    khali: [1],
    bols: ['Tin', 'Tin', 'Na', 'Dhin', 'Na', 'Dhin', 'Na'],
    defaultBpm: 80,
    common: false,
    verified: true,
  },
  {
    id: 'ektaal',
    name: 'Ektaal',
    tradition: 'hindustani',
    matras: 12,
    vibhag: [2, 2, 2, 2, 2, 2],
    sam: 1,
    tali: [1, 3, 7, 11],
    khali: [5, 9],
    bols: ['Dhin', 'Dhin', 'Dhage', 'Tirakita', 'Tu', 'Na', 'Kat', 'Ta', 'Dhage', 'Tirakita', 'Dhin', 'Na'],
    defaultBpm: 60,
    common: false,
    verified: true,
  },
  {
    id: 'chautaal',
    name: 'Chautaal',
    tradition: 'hindustani',
    matras: 12,
    vibhag: [2, 2, 2, 2, 2, 2],
    sam: 1,
    tali: [1, 3, 7, 9],
    khali: [5, 11],
    bols: ['Dha', 'Dha', 'Din', 'Ta', 'Kita', 'Dha', 'Din', 'Ta', 'Tita', 'Kata', 'Gadi', 'Ghene'],
    defaultBpm: 60,
    common: false,
    verified: true,
  },
  {
    id: 'deepchandi',
    name: 'Deepchandi',
    tradition: 'hindustani',
    matras: 14,
    vibhag: [3, 4, 3, 4],
    sam: 1,
    tali: [1, 4, 11],
    khali: [8],
    bols: ['Dha', 'Dhin', '-', 'Dha', 'Dha', 'Tin', '-', 'Ta', 'Tin', '-', 'Dha', 'Dha', 'Dhin', '-'],
    defaultBpm: 60,
    common: false,
    verified: true,
  },
  // The Carnatic talas are counted and clapped rather than played on tabla, so
  // there is no theka to give them. They are here for the structure, with the
  // counting left neutral, and stay hidden until that is settled properly.
  {
    id: 'adi',
    name: 'Adi',
    tradition: 'carnatic',
    matras: 8,
    vibhag: [4, 2, 2],
    sam: 1,
    tali: [1, 5, 7],
    khali: [],
    bols: ['Ta', 'Ka', 'Dhi', 'Mi', 'Ta', 'Ka', 'Ju', 'Nu'],
    defaultBpm: 70,
    common: false,
    verified: false,
  },
  {
    id: 'rupaka-carnatic',
    name: 'Rupaka',
    tradition: 'carnatic',
    matras: 6,
    vibhag: [2, 4],
    sam: 1,
    tali: [3],
    khali: [1],
    bols: ['Ta', 'Ka', 'Ta', 'Ka', 'Dhi', 'Mi'],
    defaultBpm: 80,
    common: false,
    verified: false,
  },
  {
    id: 'misra-chapu',
    name: 'Misra Chapu',
    tradition: 'carnatic',
    matras: 7,
    vibhag: [3, 4],
    sam: 1,
    tali: [1, 4],
    khali: [],
    bols: ['Ta', 'Ki', 'Ta', 'Ta', 'Ka', 'Dhi', 'Mi'],
    defaultBpm: 80,
    common: false,
    verified: false,
  },
  {
    id: 'khanda-chapu',
    name: 'Khanda Chapu',
    tradition: 'carnatic',
    matras: 5,
    vibhag: [2, 3],
    sam: 1,
    tali: [1, 3],
    khali: [],
    bols: ['Ta', 'Ka', 'Ta', 'Ki', 'Ta'],
    defaultBpm: 80,
    common: false,
    verified: false,
  },
];

/** Tempo range, doc 04. */
export const BPM_MIN = 40;
export const BPM_MAX = 240;

/** The taals offered in the UI: the ones whose pattern is settled. */
export function playableTaals(): Taal[] {
  return TAALS.filter((taal) => taal.verified);
}

export function taalById(id: string): Taal | undefined {
  return TAALS.find((taal) => taal.id === id);
}

/** Which vibhag a matra falls in, 0-indexed. Used to draw the dividers. */
export function vibhagOf(taal: Taal, matra: number): number {
  let counted = 0;
  for (let i = 0; i < taal.vibhag.length; i++) {
    counted += taal.vibhag[i] ?? 0;
    if (matra <= counted) return i;
  }
  return taal.vibhag.length - 1;
}
