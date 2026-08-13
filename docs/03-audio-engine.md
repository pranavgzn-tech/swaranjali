# 03 — Audio engine

## The sound we are chasing

A Paul & Co is a Kolkata-built harmonium: a wooden box with brass free reeds, bellows at the
back, three reed banks. The character is **warm, reedy, slightly nasal, with a visible
buzz** — not smooth like an organ. You hear the wooden box around the reed. You hear air.
When two reed banks are on together, they beat gently against each other because no two
reeds are perfectly in tune.

Read that paragraph again before you write a filter. Every choice below serves it.

**Honest note:** we are synthesising, not sampling. A well-tuned synthesis model gets you a
convincing harmonium — maybe 80–85% of the way to a specific instrument's character.
Section "Upgrading to samples" at the end explains the path to closing the gap later.
Build the engine so that swap is easy.

## Architecture

```
per note, per active bank:
  osc A ─┐
  osc B ─┤ detuned pair, PeriodicWave from harmonic table
  osc C ─┘ (optional third, Standard quality only)
         → bank lowpass (cutoff follows air pressure)
         → bank gain (fader level × bank envelope)
  chiff noise burst ──┘ (attack only)
                        ↓
                 note gain (attack / release envelope)
                        ↓
              ┌── INSTRUMENT BUS ───────────────┐
  air hiss ───┤                                 │
              │  body resonance (3 peaking EQ)  │
              │  soft saturation (tanh shaper)  │
              │  master gain × pressure curve   │
              └─────────────┬───────────────────┘
                            │
  drone bus ────────────────┤
  tabla bus ────────────────┤
                            ↓
                    convolver reverb (parallel wet)
                            ↓
                    limiter (DynamicsCompressor)
                            ↓
                       destination
```

> On compact devices the voice pool is smaller, the third oscillator is dropped, the reverb
> is shorter and a speaker EQ profile is applied. See `11-responsive-layouts.md`. The engine
> itself is identical — only these constants change.

## Voice pooling — important

Do **not** create oscillator nodes on key press. On iOS, graph churn causes audible glitches
and adds latency.

Instead, at startup allocate a pool of **12 note voices**. Each voice owns three bank
sub-voices, each with its permanently running oscillators, filter and gain. Oscillators run
forever from boot. A note-on retunes them and ramps the gain up. A note-off ramps the gain
to zero. Nothing is ever created or destroyed during play.

Voice stealing: oldest note first, but never steal a note that is still physically held.

## Reed harmonic tables

Build each bank's `PeriodicWave` from these relative amplitudes (harmonic 1 … 16). Use
fixed pseudo-random phases from a seeded generator so the waveform is not spiky and the
result is reproducible.

```ts
// Relative harmonic amplitudes. Derived from the spectrum of a brass free reed:
// strong odd and even content, gentle rolloff, small formant lift around 2–3 kHz.
export const HARMONICS = {
  bass:   [1.00,0.66,0.34,0.22,0.15,0.10,0.070,0.050,0.035,0.025,0.018,0.013,0.010,0.008,0.006,0.005],
  male:   [1.00,0.58,0.42,0.30,0.26,0.16,0.130,0.090,0.070,0.055,0.040,0.035,0.025,0.020,0.015,0.012],
  female: [1.00,0.48,0.38,0.28,0.24,0.19,0.150,0.110,0.090,0.070,0.055,0.045,0.035,0.030,0.022,0.018],
} as const;
```

Bank pitch offsets:

| Bank | Offset | Role |
|---|---|---|
| Bass | −12 semitones (16′) | body and depth |
| Male | 0 (8′) | the main voice |
| Female | +12 semitones (4′) | brightness and carry |

## Detune and drift — this is what makes it sound alive

Within each bank:
- osc A at **−4 cents**, osc B at **+5 cents**, osc C (if enabled) at **−1 cent**.
- Each oscillator gets an independent slow drift LFO: rate randomised per voice in
  **0.13–0.31 Hz**, depth **±1.8 cents**.

Never let two oscillators sit at exactly the same frequency. That is what makes a synth
sound like a synth.

## Attack behaviour

A free reed does not start instantly. It takes a moment to begin vibrating, and it starts
slightly flat before settling.

| Bank | Gain attack | Pitch scoop |
|---|---|---|
| Bass | 45 ms | −34 cents → 0 over 52 ms |
| Male | 32 ms | −28 cents → 0 over 40 ms |
| Female | 26 ms | −22 cents → 0 over 34 ms |

Use `exponentialRampToValueAtTime` for gain (from 0.0001, never 0). Use
`setValueCurveAtTime` or a short exponential ramp for the pitch scoop.

**Chiff:** on attack, fire a short noise burst through a bandpass centred at 4× the
fundamental, Q = 2.5, decaying over 18 ms, at −22 dB scaled by current air pressure. This is
the little "puff" as air first crosses the reed. It matters more than you'd expect.

## Release

- Gain ramps to zero over **90 ms**.
- Add a key-off thump: 12 ms lowpassed noise burst at −30 dB, cutoff 400 Hz. That is the
  key returning and the pallet closing.

## Bellows / air reservoir — the heart of the instrument

Run this as a simple simulation, updated at ~60 Hz from `requestAnimationFrame`, writing
into audio params with short ramps (never step changes).

```ts
export const BELLOWS = {
  pumpRate: 1.9,          // pressure units per second while the paddle is held
  passiveLeak: 0.055,     // per second, always
  drawFirstNote: 0.085,   // per second for one sounding note
  drawEachExtra: 0.042,   // per second per additional note
  bankDraw: { bass: 1.3, male: 1.0, female: 0.8 }, // weighted by fader level
  speakThreshold: 0.055,  // below this the reeds stop speaking
  fadeOutMs: 70,
  assistFloor: 0.78,      // assist mode holds pressure at least this high
  max: 1.0,
} as const;
```

How pressure shapes the sound:

| Parameter | Mapping |
|---|---|
| Master gain | `gain = pressure ^ 0.75` |
| Male filter cutoff | `700 + pressure × 5300` Hz |
| Bass filter cutoff | `500 + pressure × 2600` Hz |
| Female filter cutoff | `1100 + pressure × 7400` Hz |
| Pitch | `cents = (pressure − 0.7) × 20` — sharpens under hard pumping |
| Air hiss level | `pressure × 0.012` |

Push the pump too hard and pressure caps at 1.0 — the extra effort is simply wasted, as on
a real instrument. Show this: the reservoir meter sits at full and the paddle resists.

**Pump interaction:**
- Press and hold fills the reservoir.
- Release lets it fall. The natural rhythm is a stroke every 2–4 seconds.
- The paddle is analogue: how far down the finger drags scales `pumpRate` from 0.6× to 1.4×.
- A bellows return noise (soft filtered noise swell, 180 ms) plays on release.

**Assist mode:** off by default. When on, pressure never drops below `assistFloor`. The UI
label says plainly that this is training wheels and that a real harmonium will not do it.

## Cabinet, saturation, reverb

```ts
export const BODY = {
  resonances: [                       // wooden box formants
    { freq: 172,  gain:  3.0, q: 1.1 },
    { freq: 430,  gain:  2.0, q: 1.4 },
    { freq: 1150, gain:  2.5, q: 2.0 },
  ],
  highShelf: { freq: 9000, gain: -4.0 },
  saturationDrive: 1.4,               // tanh waveshaper, 4096-point curve
} as const;

export const REVERB = {
  // Generate the impulse in code — no audio files to download.
  // Exponentially decaying filtered noise, stereo, decorrelated channels.
  seconds: 1.1,
  decay: 2.4,
  preDelayMs: 12,
  defaultWet: 0.18,
} as const;

export const LIMITER = { threshold: -6, knee: 0, ratio: 20, attack: 0.003, release: 0.12 };
```

## The stop mixer — nine stops plus master

A Paul & Co "9 stopper" is the model. Faders, left to right:

| # | Fader | Range | Default |
|---|---|---|---|
| 1 | Bass (16′) | 0–1 | 0.55 |
| 2 | Male (8′) | 0–1 | 1.00 |
| 3 | Female (4′) | 0–1 | 0.35 |
| 4 | Coupler | 0–1 | 0.00 |
| 5 | Drone Sa (mandra) | 0–1 | 0.00 |
| 6 | Drone Sa (madhya) | 0–1 | 0.00 |
| 7 | Drone Pa / Ma | 0–1 | 0.00 |
| 8 | Tanpura | 0–1 | 0.00 |
| 9 | Reverb | 0–1 | 0.18 |
| — | **Master** | 0–1 | 0.80 |

Fader 7 has a small toggle beneath it to choose Pa or shuddh Ma, because ragas that omit Pa
(Marwa, Puriya) drone on Ma instead.

Faders are logarithmic in perceived loudness: `gain = value ^ 2.2` for level faders. Reverb
is linear wet mix.

**Coupler** adds the same note one octave up on the male bank at the coupler fader's level,
with a slightly slower attack (+8 ms) and −3 dB. That is what a mechanical coupler does.

## Drone reeds vs tanpura

- **Drone stops (5, 6, 7)** are sustained harmonium reeds. Same engine, no key needed, no
  attack scoop after the first onset. They draw air from the reservoir like any other note —
  which is authentic and will surprise the user in a good way.
- **Tanpura (8)** is a separate model: Karplus-Strong plucked string with a bridge
  nonlinearity for the jawari buzz, four strings cycling Pa–Sa–Sa–Sa′ (or Ma / Ni variants),
  pluck interval 1.1–1.6 s with slight human jitter. It does **not** draw air.

## Tabla / taal engine

Lookahead scheduler: a `setInterval` at 25 ms that schedules any beat falling within the
next 100 ms, using `audioContext.currentTime` as the clock. Never schedule from
`setTimeout` alone.

Tabla voices are synthesised (no downloads): a pitched membrane model — a short sine burst
with rapid pitch drop plus filtered noise, per bol. Tune the dayan to the current Sa.
Bols needed: **Dha, Dhin, Na, Tin, Ta, Ke, Ge, Tun, Te, Re**.

If the synthesised tabla is not convincing after a solid attempt, say so and stop — do not
ship a bad one. Sample sourcing is a Phase 4 decision, noted in `10-decisions-and-risks.md`.

## Context setup

```ts
const ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 });
```

Unlock on the first user gesture: `ctx.resume()` plus playing a one-sample silent buffer.
Show a "Tap to begin" panel until the context is running. Re-check on `visibilitychange` —
iOS suspends the context when the app is backgrounded.

## Recording

`MediaStreamAudioDestinationNode` off the limiter, into `MediaRecorder`. A settings toggle
mixes in `getUserMedia` microphone audio so the user can record themselves singing over the
harmonium. Save as a Blob, offer download, keep the last 10 in memory only. Ask for mic
permission only when the user turns that toggle on, never at startup.

## Upgrading to samples later

Build the bank sub-voice behind an interface:

```ts
interface ToneSource {
  noteOn(freqHz: number, atTime: number): void;
  noteOff(atTime: number): void;
  setPressure(p: number, atTime: number): void;
}
```

`SynthReedSource` implements it now. A `SampledReedSource` can implement it later using
`AudioBufferSourceNode` with looped sustain regions, one sample every 3 semitones. The
bellows model, mixer, body and reverb stay exactly as they are.
