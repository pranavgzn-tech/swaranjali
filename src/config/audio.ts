/**
 * Every audio constant from docs/03-audio-engine.md. Nothing in the engine
 * invents a number; if a value is not here, it is not used.
 */

export type BankId = 'bass' | 'male' | 'female';

export const BANK_IDS: readonly BankId[] = ['bass', 'male', 'female'] as const;

export const CONTEXT_OPTIONS = {
  latencyHint: 'interactive',
  sampleRate: 48000,
} as const satisfies AudioContextOptions;

/**
 * Relative harmonic amplitudes, harmonic 1…16. Derived from the spectrum of a
 * brass free reed: strong odd and even content, gentle rolloff, small formant
 * lift around 2–3 kHz.
 */
export const HARMONICS = {
  bass: [1.0, 0.66, 0.34, 0.22, 0.15, 0.1, 0.07, 0.05, 0.035, 0.025, 0.018, 0.013, 0.01, 0.008, 0.006, 0.005],
  male: [1.0, 0.58, 0.42, 0.3, 0.26, 0.16, 0.13, 0.09, 0.07, 0.055, 0.04, 0.035, 0.025, 0.02, 0.015, 0.012],
  female: [1.0, 0.48, 0.38, 0.28, 0.24, 0.19, 0.15, 0.11, 0.09, 0.07, 0.055, 0.045, 0.035, 0.03, 0.022, 0.018],
} as const satisfies Record<BankId, readonly number[]>;

/** Seed for the phase generator, so every build produces the same waveform. */
export const WAVETABLE_PHASE_SEED = 0x5761726e; // "Swar"

/** Bank pitch offsets in semitones: 16′ body, 8′ main voice, 4′ brightness. */
export const BANK_SEMITONES = { bass: -12, male: 0, female: +12 } as const satisfies Record<BankId, number>;

/**
 * Detune per oscillator within a bank, in cents. Two oscillators on the lite
 * tier, three on regular. No two oscillators ever sit at the same frequency —
 * that is what makes a synth sound like a synth.
 */
export const OSC_DETUNE_CENTS = [-4, +5, -1] as const;

/** Independent slow drift LFO per oscillator, randomised once per voice. */
export const DRIFT = {
  rateMinHz: 0.13,
  rateMaxHz: 0.31,
  depthCents: 1.8,
} as const;

/**
 * A free reed does not start instantly: it takes a moment to begin vibrating
 * and starts slightly flat before settling.
 */
export const ATTACK = {
  bass: { gainMs: 45, scoopCents: -34, scoopMs: 52 },
  male: { gainMs: 32, scoopCents: -28, scoopMs: 40 },
  female: { gainMs: 26, scoopCents: -22, scoopMs: 34 },
} as const satisfies Record<BankId, { gainMs: number; scoopCents: number; scoopMs: number }>;

/** Gain ramps start here, never at 0 — exponentialRampToValueAtTime needs it. */
export const GAIN_FLOOR = 0.0001;

/**
 * The puff of air as it first crosses the reed. It matters more than you would
 * expect: without it the attack reads as a click.
 */
export const CHIFF = {
  bandpassMultiple: 4, // centred at 4× the fundamental
  q: 2.5,
  decayMs: 18,
  levelDb: -22, // scaled by current air pressure
} as const;

/** The key returning and the pallet closing. */
export const RELEASE = {
  gainMs: 90,
  thumpMs: 12,
  thumpLevelDb: -30,
  thumpCutoffHz: 400,
} as const;

/**
 * Air reservoir. Pressure is a unitless 0…1 quantity, stepped at ~60 Hz from
 * requestAnimationFrame and written into audio params with short ramps.
 */
export const BELLOWS = {
  pumpRate: 1.9, // pressure units per second while the paddle is held
  passiveLeak: 0.055, // per second, always
  drawFirstNote: 0.085, // per second for one sounding note
  drawEachExtra: 0.042, // per second per additional note
  bankDraw: { bass: 1.3, male: 1.0, female: 0.8 }, // weighted by fader level
  speakThreshold: 0.055, // below this the reeds stop speaking
  fadeOutMs: 70,
  assistFloor: 0.78, // assist mode holds pressure at least this high
  max: 1.0,
} as const;

/** How far the finger drags down the paddle scales the pump rate. */
export const PUMP_TRAVEL_RATE = { min: 0.6, max: 1.4 } as const;

/** Soft filtered noise swell as the bellows returns. */
export const BELLOWS_RETURN = { ms: 180 } as const;

/**
 * How pressure shapes the sound. Each entry is `base + pressure × span`,
 * except gain which is `pressure ^ exponent` and pitch which is a linear
 * offset around a centre.
 */
export const PRESSURE = {
  gainExponent: 0.75,
  cutoffHz: {
    bass: { base: 500, span: 2600 },
    male: { base: 700, span: 5300 },
    female: { base: 1100, span: 7400 },
  },
  /** cents = (pressure − centre) × span — sharpens under hard pumping. */
  pitch: { centre: 0.7, span: 20 },
  hissLevel: 0.012, // × pressure
} as const;

/** The wooden box around the reed. */
export const BODY = {
  resonances: [
    { freq: 172, gain: 3.0, q: 1.1 },
    { freq: 430, gain: 2.0, q: 1.4 },
    { freq: 1150, gain: 2.5, q: 2.0 },
  ],
  highShelf: { freq: 9000, gain: -4.0 },
  saturationDrive: 1.4, // tanh waveshaper
  saturationCurvePoints: 4096,
} as const;

/** The impulse is generated in code at boot — no IR file to download. */
export const REVERB = {
  seconds: 1.1,
  decay: 2.4,
  preDelayMs: 12,
  defaultWet: 0.18,
} as const;

export const LIMITER = { threshold: -6, knee: 0, ratio: 20, attack: 0.003, release: 0.12 } as const;

/**
 * Voice pool. Allocated once during "Tap to begin"; oscillators run from boot
 * and are never created or destroyed during play.
 */
export const VOICE_POOL = { size: 12, oscPerBank: 3 } as const;

/** The nine stops plus master, in mixer order. Doc 03. */
export type FaderId =
  | 'bass'
  | 'male'
  | 'female'
  | 'coupler'
  | 'droneSaMandra'
  | 'droneSaMadhya'
  | 'dronePaMa'
  | 'tanpura'
  | 'reverb'
  | 'master';

export const FADER_ORDER: readonly FaderId[] = [
  'bass',
  'male',
  'female',
  'coupler',
  'droneSaMandra',
  'droneSaMadhya',
  'dronePaMa',
  'tanpura',
  'reverb',
  'master',
] as const;

export const FADER_DEFAULTS: Readonly<Record<FaderId, number>> = {
  bass: 0.55,
  male: 1.0,
  female: 0.35,
  coupler: 0.0,
  droneSaMandra: 0.0,
  droneSaMadhya: 0.0,
  dronePaMa: 0.0,
  tanpura: 0.0,
  reverb: 0.18,
  master: 0.8,
};

/** Level faders are logarithmic in perceived loudness; reverb is linear wet. */
export const FADER_CURVE_EXPONENT = 2.2;
export const LINEAR_FADERS: readonly FaderId[] = ['reverb'] as const;

/** What a mechanical coupler does: the same note an octave up, on the male bank. */
export const COUPLER = { semitones: +12, extraAttackMs: 8, levelDb: -3 } as const;

/**
 * Tanpura, doc 03: Karplus-Strong with a bridge nonlinearity for the jawari
 * buzz, four strings cycling with a slightly human pluck interval.
 *
 * The loop values are not in the spec — doc 03 names the model rather than its
 * coefficients — so they are tuned by ear and recorded in DECISIONS.md.
 */
export const TANPURA = {
  pluckMinS: 1.1,
  pluckMaxS: 1.6,
  pluckMs: 6, // length of the noise burst that excites a string
  pluckGain: 0.5,
  feedback: 0.988, // just under 1: the string rings for several seconds
  dampingHz: 2600, // high partials die away first, as on a real string
  // Maximally flat. A biquad lowpass at the default Q of 1 has a resonant
  // peak of about 1.15 just below its cutoff, and inside a feedback loop that
  // is enough to push the gain above 1 and turn the string into an oscillator.
  dampingQ: 0.707,
  dcBlockHz: 45, // a string cannot hold a constant displacement, and neither can the loop
  jawariDrive: 1.9, // how hard the string is folded against the bridge
  jawariFold: 0.55, // how much of the signal stays linear
  jawariCurvePoints: 2048,
} as const;

/**
 * Faders that are present in the mixer but not yet live, and are drawn as
 * such. The three drone stops came alive in Phase 2; the tanpura has not,
 * because its string model is not finished — see DECISIONS.md.
 */
export const PENDING_FADERS: readonly FaderId[] = ['tanpura'] as const;
