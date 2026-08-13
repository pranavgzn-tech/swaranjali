# 07 — Data schemas

All data ships as JSON in `src/data/` and is imported at build time. No runtime fetching.
Define the matching TypeScript types in the same module that imports each file, and validate
shape at build time with a small script — a malformed raga should fail the build.

## Core pitch types

```ts
/** Semitones above Sa, 0–11. Sa = 0, komal Re = 1, ... Ni = 11. */
export type Degree = 0|1|2|3|4|5|6|7|8|9|10|11;

/** Octave register relative to the chosen Sa. */
export type Saptak = 'mandra' | 'madhya' | 'taar';

export interface Swara {
  degree: Degree;
  saptak: Saptak;
  /** 'S' | 'r' | 'R' | 'g' | 'G' | 'm' | 'M' | 'P' | 'd' | 'D' | 'n' | 'N' */
  hindustani: string;
  /** 'S' | 'R1' | 'R2' | 'G2' | 'G3' | 'M1' | 'M2' | 'P' | 'D1' | 'D2' | 'N2' | 'N3' */
  carnatic: string;
  devanagari: string;
  komal: boolean;
  tivra: boolean;
}
```

## Thaat

```ts
export interface Thaat {
  id: string;            // 'kalyan'
  name: string;          // 'Kalyan'
  degrees: Degree[];     // exactly 7, ascending, always includes 0
}
```

## Raga

```ts
export interface Raga {
  id: string;                 // 'yaman'
  name: string;               // 'Yaman'
  tradition: 'hindustani' | 'carnatic';
  thaat: string | null;       // thaat id, null for carnatic entries
  melakarta: number | null;   // 1–72, null for hindustani entries
  aroha: Degree[];            // ascending phrase, may skip and may exceed one octave
  avaroha: Degree[];          // descending phrase
  pakad: Degree[] | null;     // characteristic phrase; null if unverified
  vadi: Degree | null;        // most important swara
  samvadi: Degree | null;     // second most important
  varjit: Degree[];           // omitted swaras
  jati: 'audav' | 'shadav' | 'sampurna' | 'mixed';  // 5 / 6 / 7 note
  timeOfDay: string | null;   // 'first prahar of the night', etc.
  mood: string;               // one line, plain language
  verified: boolean;          // false means "do not show in raga mode yet"
}
```

`verified: false` is how you flag anything you were unsure about. Do not guess a pakad to
fill the field.

## Melakarta

Generate these, do not type them.

```ts
export interface Melakarta {
  number: number;        // 1–72
  name: string;
  chakra: string;        // 'Indu', 'Netra', ... 'Rudra'
  degrees: Degree[];     // exactly 7 including Sa and Pa
}
```

Generation rule: melakartas 1–36 use shuddh Ma (degree 5), 37–72 use prati Ma (degree 6).
Within each half, the 36 are indexed by a 6×6 grid: the first index selects the Ra–Ga pair,
the second the Dha–Ni pair, from the six valid combinations of each.

## Taal

```ts
export interface Taal {
  id: string;
  name: string;
  tradition: 'hindustani' | 'carnatic' | 'light';
  matras: number;
  vibhag: number[];          // e.g. [4,4,4,4] — must sum to matras
  sam: number;               // 1-indexed matra
  tali: number[];            // 1-indexed matras that are clapped
  khali: number[];           // 1-indexed matras that are waved
  bols: string[];            // length === matras
  defaultBpm: number;
  common: boolean;           // true = show at the top of the list
}
```

## Alankar

```ts
export interface Alankar {
  id: string;
  name: string;
  /**
   * Scale-step indices into the current raga's aroha/avaroha, NOT semitones.
   * This is what makes a pattern transpose into any raga automatically.
   * Negative values reach below Sa, values >= scale length reach above.
   */
  ascending: number[];
  descending: number[];
  difficulty: 1|2|3;
  note: string;
}
```

## Composition

```ts
export interface Composition {
  id: string;
  title: string;
  tradition: string;
  raga: string | null;       // raga id
  taal: string;              // taal id
  defaultBpm: number;
  lines: NotationLine[];
  /** Where the words and melody come from, and why they are free to include. */
  provenance: string;
  /** Must be true for anything that ships. */
  publicDomain: true;
}

export interface NotationLine {
  /** One entry per matra. An entry may hold more than one swara. */
  matras: MatraCell[];
  /** Lyric syllables aligned to the matra grid. Empty string for a rest. */
  lyrics: string[];
}

export interface MatraCell {
  swaras: { degree: Degree; saptak: Saptak }[];
  /** true if the previous matra's note carries through */
  sustain: boolean;
}
```

## Settings (localStorage)

```ts
export interface Settings {
  version: 1;
  sa: Degree;                    // which pitch class is Sa, 0 = C
  referenceA4: number;           // 415–466
  saMode: 'absolute' | 'fixed';
  tuning: '12tet' | 'shruti';
  keyboardMode: 'wide' | 'standard' | 'compact';
  octaveShift: number;           // −2 … +2
  labelStyle: 'hindustani' | 'carnatic' | 'devanagari' | 'western';
  showWesternSecondary: boolean;
  faders: Record<FaderId, number>;
  assistMode: boolean;
  droneNote: 'pa' | 'ma';
  handedness: 'right' | 'left';
  wakeLock: boolean;
  micInRecordings: boolean;
}
```

Persist on change, debounced 400 ms. Migrate by `version` — never silently drop a user's
settings on a schema change.

## Validation script

`npm run validate-data` checks, at minimum:

- every `vibhag` sums to `matras`, and `bols.length === matras`
- every `sam`, `tali`, `khali` is within 1…matras and none overlap
- every raga's `aroha` and `avaroha` contain degree 0
- every raga's `varjit` is disjoint from its aroha and avaroha
- every thaat has exactly 7 degrees including 0
- exactly 72 melakartas, each with 7 degrees including 0 and 7
- every composition has `publicDomain: true` and a non-empty `provenance`

This script runs as part of `npm run build`. A data error fails the build.
