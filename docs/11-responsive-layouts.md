# 11 — Responsive layouts: iPhone and iPad

The app runs on an iPhone as well as the iPad Air. This is **not** a scaled-down iPad
layout. The phone gets a different arrangement and, in portrait, a different job.

Read this alongside `02-ipad-layout.md`, which describes the Regular (iPad) layout in full.

## Size classes — decide by viewport, never by user agent

Never sniff the user agent. iPad Split View and Slide Over produce phone-sized viewports on
an iPad, and a layout keyed to the device name will get them wrong.

```ts
export type SizeClass = 'regular' | 'compact-landscape' | 'compact-portrait';

export function sizeClass(w: number, h: number): SizeClass {
  if (w >= 1000 && h >= 700) return 'regular';           // iPad full screen
  if (w > h)                 return 'compact-landscape';  // phone landscape, iPad split
  return 'compact-portrait';                              // phone portrait
}
```

Compute `w` and `h` from `visualViewport` **minus** the safe-area insets, and recompute on
`resize`, `orientationchange`, and `visualViewport.resize`. Rebuild the cached hit-region
geometry every time it changes — stale rectangles after a rotate is the most likely bug in
this whole feature.

## The key-size finding — the reason one octave is the right answer

Real harmonium white key: **21.0 mm**. iPad Standard mode: **15.1 mm**.

Eight white keys (one octave, Sa to Sa) across the usable width of any iPhone:

| Device | Usable width (pt) | Key width (pt) | Key width (mm) |
|---|---|---|---|
| iPhone SE (3rd gen) | 667 | 83.4 | **13.0** |
| iPhone 13/14 mini | 712 | 89.0 | **14.2** |
| iPhone 15/16 / Pro | 734 | 91.8 | **15.2** |
| iPhone 15/16 Plus / Pro Max | 814 | 101.8 | **16.9** |
| iPhone 16 Pro Max | 832 | 104.0 | **17.2** |

Every one of these lands within a millimetre or two of the iPad's default key size, and the
larger phones are actually *closer to a real harmonium* than the iPad is.

So the rule is simple: **compact landscape always shows exactly 8 white keys** (one octave,
Sa to Sa inclusive), scaled to the available width. Do not try to fit more. Do not make the
key count configurable on phone. Muscle memory transfers between devices because the key
size barely changes — that is the whole point.

Octave shift matters far more here than on the iPad. Give it prominent, one-tap buttons.

## Compact landscape layout

Design target 852 × 393 (iPhone 15/16). Must adapt from 667 × 375 up to 956 × 440.

```
┌─ usable area, safe insets already removed ─────────────────┐
│ ☰   Sa C   ◀ oct ▶        STOPS ▾        air ▮▮▮▮▯▯        │  44 pt  top bar
├────────────────────────────────────────────────────────────┤
│  Sa  Re  Ga  Ma  Pa  Dha Ni  Sa   ← labels at the TOP      │
│  ┌──┬─┬──┬─┬──┬──┬─┬──┬─┬──┬─┬──┬──┐                       │
│  │  │▓│  │▓│  │  │▓│  │▓│  │▓│  │  │           keyboard    │ 250 pt
│  │  └─┘  └─┘  │  └─┘  └─┘  └─┘  │  │                       │
│  └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘                       │
├────────────────────────────────────────────────────────────┤
│  ░░░░░░░░  PUMP — full width strip  ░░░░░░░░               │  78 pt
└────────────────────────────────────────────────────────────┘
                                              44 + 250 + 78 = 372 ✓
```

Three deliberate differences from the iPad:

1. **Key labels sit at the top of the key, not the bottom.** Phone keys are only ~250 pt
   long. Fingers land on the lower half and would cover bottom labels. On the iPad the keys
   are long enough that bottom labels stay visible, so the two layouts differ here on
   purpose — do not "fix" this to match.

2. **The pump is a full-width strip along the bottom.** The left thumb can pump anywhere
   along it. A resting palm triggering it is harmless, because extra air only tops up a
   reservoir that caps at 1.0. That forgiveness is intentional.

3. **The stop mixer lives in a pull-down sheet**, not on screen. Ten faders cannot be
   thumb-accurate at this width. The sheet covers the top two-thirds, keeps the pump strip
   visible and live underneath so air does not drain while adjusting, and dismisses on tap
   outside or swipe up.

```ts
export const COMPACT_LANDSCAPE = {
  topBarH: 44,
  keyboardH: 250,      // scale to fit: clamp(210, usableH - 122, 290)
  pumpH: 78,
  whiteCount: 8,       // fixed — never configurable on phone
  blackW: 0.56,        // fraction of white key width
  blackH: 0.62,        // fraction of keyboard height
  labelFromTop: 26,    // sargam baseline, measured from the top of the key
  westernFromTop: 48,
  sheetCoverage: 0.66, // stops sheet height as fraction of usable height
} as const;
```

Type scale drops on compact: sargam label 19 pt, Western label 11 pt, fader label 11 pt.

## Compact portrait — companion mode

**Do not render a keyboard in portrait.** The phone in portrait is not a playable
harmonium, and pretending otherwise produces a bad instrument.

What it is instead is genuinely useful, and it is what Indian musicians already prop next to
themselves while practising: a **shruti box and lehra**. Portrait shows:

```
┌ Sa  C        A4 440 ─┐
│                      │
│      ╭────────╮      │   Sa dial — large, draggable
│      │   Sa   │      │
│      ╰────────╯      │
│                      │
│  Drone     ▮▮▮▮▯▯    │
│  Tanpura   ▮▮▯▯▯▯    │
│                      │
│  Keherwa       80 ⏵  │
│  ● ● ● ● ○ ● ● ●     │   matra dots, sam and khali marked
│                      │
│  ─ notation / lyrics ─│   scrolling, if a composition is open
│                      │
│  ◉ Record    ♪ Tuner │
└──────────────────────┘
```

A single quiet line at the bottom reads: rotate to play. No half-keyboard, no shrunken
instrument.

This mode has real standalone value — it means the phone in his pocket is a working shruti
box during a bhajan session, with no harmonium involved at all.

## Safe areas — the part that will bite

On iPhone in landscape, the Dynamic Island or notch eats a **59–62 pt column on one side**,
and *which* side depends on which way the phone was rotated. The home indicator eats
**21 pt** along the bottom.

- Always use `env(safe-area-inset-left/right/top/bottom)`. Never hard-code 59.
- Never assume left and right insets are equal. Read both, every time.
- The pump strip must sit **above** the bottom inset, not under the home indicator.
- Re-read insets on `orientationchange` — they swap.

```css
.stage {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  height: 100dvh;   /* not 100vh — vh is wrong on iOS with dynamic toolbars */
}
```

## PWA install is effectively mandatory on iPhone

In Safari on an iPhone in landscape, the browser chrome takes roughly 50 pt of a 393 pt
screen — about **13% of the vertical space**, on the axis that is already tightest.
Installed to the home screen, the app gets the full viewport.

So on a compact viewport running inside Safari (`navigator.standalone === false`), show a
one-time banner explaining how to add it to the home screen, with the concrete steps: Share
button, then Add to Home Screen. Dismissible, remembered, never shown again once installed.

## Audio changes on compact devices

**The iPhone speaker has no low end.** The bass 16′ reed will be inaudible on it and will
only eat headroom and cause the limiter to pump. Compensate:

```ts
export const COMPACT_AUDIO = {
  voicePoolSize: 8,          // 12 on regular — fewer fingers fit anyway
  oscPerBank: 2,             // drop the third oscillator
  reverbSeconds: 0.8,        // 1.1 on regular; long reverb on a small speaker is mush
  maxReverbWet: 0.12,
  defaultBassFader: 0.25,    // 0.55 on regular
} as const;

export const SPEAKER_PROFILE = {
  // Applied when output route is 'speaker'. Bypassed for headphones.
  highpass: { freq: 180, q: 0.7 },
  presence: { freq: 2500, gain: 2.0, q: 0.9 },
} as const;
```

The web cannot detect whether headphones are plugged in. So put a **two-way toggle in
settings — Speaker / Headphones** — defaulting to Speaker on compact and Headphones on
regular, and switch the profile from it. One sentence of copy explains what it does.

**Performance tiering.** Do not guess from the device name. At boot, during the "Tap to
begin" screen, run a short benchmark: build the wavetables and the reverb impulse and time
it. If it exceeds a threshold, drop to the compact audio settings even on a large viewport,
and note it in the diagnostics panel.

## iPhone-specific interruptions

These are all more likely on a phone than on an iPad, and each one can leave a note droning
or the context dead:

| Event | Required handling |
|---|---|
| Incoming call | `statechange` → suspended. Release all voices. Resume on return. |
| Notification banner | Usually survives, but pointers get cancelled. Handle `pointercancel`. |
| Ring/silent switch | **Silences Web Audio.** Undetectable from the web. See below. |
| Low Power Mode | Wake Lock may be refused, frame rate may be capped. Degrade quietly. |
| Rotation | Recompute layout, rebuild hit regions, release all voices during the transition. |

**The silent switch is the single most likely support question.** He will flip it, hear
nothing, and assume the app is broken. Include it as a first-run tip on compact devices and
in the settings help: if there is no sound, check the switch on the side of the phone.

## Shared code, separate layout modules

Everything below the UI is shared and must not branch on size class: the audio engine, the
bellows model, the music theory, the data, the state store. Only these differ:

```
src/ui/layouts/
  regular.ts             the iPad three-band layout from doc 02
  compact-landscape.ts   the phone instrument layout
  compact-portrait.ts    companion mode
```

`main.ts` picks one at boot and re-picks on viewport change, tearing down the old layout's
DOM and event listeners cleanly. Settings persist across the switch — Sa, tuning, fader
levels and reference pitch are all device-independent and must survive rotation and
device change.

## Acceptance additions

Add these to the Phase 1 and Phase 2 checklists in `09-acceptance-tests.md`:

- [ ] Rotating the phone mid-note releases the note and does not leave it stuck
- [ ] After rotation, every key hit region is correct — tap each key and confirm the pitch
- [ ] Nothing sits under the Dynamic Island in either landscape orientation
- [ ] The pump strip clears the home indicator
- [ ] Eight white keys exactly fill the usable width with no gap and no overflow
- [ ] Key labels are legible at arm's length on the phone, not just in a simulator
- [ ] Portrait shows companion mode with no keyboard
- [ ] Backgrounding the app and taking a call, then returning, restores audio with no
      stuck notes
- [ ] Speaker profile audibly removes the mud when playing through the phone speaker
- [ ] The app runs in iPad Split View at half width without breaking
