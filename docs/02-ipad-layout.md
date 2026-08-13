# 02 — iPad layout and geometry (Regular size class)

**This is the hardest constraint in the project. Read every number.**

> This doc covers the **iPad** layout only. The iPhone layouts are in
> `11-responsive-layouts.md` and are deliberately different, not scaled versions of this
> one. Read both before building any UI.

## The device

iPad Air 10.9". Landscape.

| Measure | Value |
|---|---|
| Logical size (CSS points) | **1180 × 820 pt** |
| Physical pixels | 2360 × 1640 @ 2× |
| Pixel density | 264 ppi |
| **1 pt** | **≈ 0.192 mm** |
| Usable width | ≈ 227 mm |
| Usable height | ≈ 158 mm |

Design in points. Convert to millimetres only when reasoning about hand comfort.

## The key-width problem — read this before designing anything

A real harmonium white key is about **21 mm** wide. A piano key is 23.5 mm.

227 mm of screen ÷ 21 mm = **10.8 white keys.** That is one and a half octaves at full size.
A real harmonium has 39 to 42 keys. You physically cannot fit them.

So we compromise, deliberately:

| Mode | White keys | Width each | vs. real | Feel |
|---|---|---|---|---|
| **Standard (default)** | 15 (2 octaves, C→C) | 78.7 pt ≈ **15.1 mm** | 72% | Comfortable one-hand melody |
| Wide | 11 (1.5 octaves) | 107.3 pt ≈ **20.6 mm** | 98% | Near real size, less range |
| Compact | 18 (2.5 octaves) | 65.6 pt ≈ **12.6 mm** | 60% | Cramped, more range |

Default to **Standard**. Offer the other two in settings. Tell the user in the settings
copy that Wide matches a real harmonium's key size most closely.

Octave shift buttons move the visible window by 12 semitones. Full instrument range spans
**F2 to C6** (42 semitones), matching a 42-key harmonium.

## Screen regions

```
 0                    300                                                      1180
 ┌──────────────────────┬─────────────────────────────────────────────────────────┐
 │                      │  STOP MIXER  (880 × 300)                                │  0
 │   PUMP PADDLE        │  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐   ┃┌──┐           │
 │   (300 × 230)        │  │  ││  ││  ││  ││  ││  ││  ││  ││  │   ┃│  │           │
 │                      │  │▓▓││▓▓││▓▓││▓▓││▓▓││▓▓││▓▓││▓▓││▓▓│   ┃│▓▓│           │
 │                      │  └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘   ┃└──┘           │
 ├──────────────────────┤  BASS MALE FEM COUP SA· SA˙ PA TANP REV ┃ MASTER        │  230
 │ ◀oct  Sa:C  oct▶  ☰  │                                                         │
 ├──────────────────────┴─────────────────────────────────────────────────────────┤  300
 │                                                                                │
 │   KEYBOARD  (1180 × 520)                                                       │
 │   ┌──┬─┬──┬─┬──┬──┬─┬──┬─┬──┬─┬──┬──┬─┬──┐                                     │
 │   │  │▓│  │▓│  │  │▓│  │▓│  │▓│  │  │▓│  │   black keys 322 pt long            │
 │   │  └─┘  └─┘  │  └─┘  └─┘  └─┘  │  └─┘  │                                     │
 │   │Sa│  │Re│  │Ga│Ma│  │Pa│  │Dha│ │Ni│Sa│   labels near the bottom            │
 │   └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘                                     │
 └────────────────────────────────────────────────────────────────────────────────┘  820
```

The pump sits top-left as requested, and the keyboard runs the **full screen width** below
it. That was a deliberate choice — putting the pump in a full-height left column would cost
you roughly three keys.

> **These are reference values at a zero top inset.** Once installed to the home screen the
> iPad reports a status-bar inset and the top band shrinks. Treat the mixer numbers as
> ratios of a 300 pt band and derive them at runtime — see
> `12-install-fullscreen-offline.md`.

## Exact values — put these in `src/config/layout.ts`

```ts
export const SCREEN = { w: 1180, h: 820 } as const;

export const PUMP = {
  x: 0, y: 0, w: 300, h: 230,
  cornerRadius: 18,
  travel: 26,          // pt the paddle visually depresses
} as const;

export const PUMP_CONTROLS = { x: 0, y: 230, w: 300, h: 70 } as const;

export const MIXER = {
  x: 300, y: 0, w: 880, h: 300,
  faderCount: 10,      // 9 stops + master
  faderPitch: 88,      // pt between fader centres
  trackW: 10,
  trackH: 168,
  trackTop: 52,        // y offset within the mixer band
  capW: 62,            // fader cap — must be an easy thumb target
  capH: 34,
  labelBaseline: 244,
  masterGapBefore: 14, // extra separation before the master fader
} as const;

export const KEYBOARD = {
  x: 0, y: 300, w: 1180, h: 520,
  whiteCount: 15,      // Standard mode
  whiteW: 78.666,      // 1180 / 15
  whiteH: 520,
  blackW: 46,
  blackH: 322,         // 62% of white
  labelFromBottom: 46, // sargam baseline
  westernFromBottom: 22,
} as const;
```

## Black key placement

Black keys are centred on the boundary between the white keys they sit between, offset
slightly outward the way a real keyboard does it. Offsets from the boundary, in points:

| Black key | Offset |
|---|---|
| C♯ / komal Re | −6 |
| D♯ / komal Ga | +6 |
| F♯ / tivra Ma | −8 |
| G♯ / komal Dha | 0 |
| A♯ / komal Ni | +8 |

## Touch targets

- The pump paddle is 300 × 230 pt. Nothing smaller is acceptable — the left hand rests
  there for the entire session and a small button causes strain within minutes.
- Fader caps are 62 × 34 pt with a 20 pt invisible hit padding on every side.
- The fader also responds to a drag anywhere on its column, not just the cap.
- Small buttons are never smaller than 44 × 44 pt of hit area.

## Safe areas

- Use `viewport-fit=cover` and read `env(safe-area-inset-*)`.
- In landscape the home indicator sits along the bottom edge. Keep the bottom **20 pt** of
  the keyboard free of anything that must be tapped — key labels sit above it.
- Rounded display corners clip about 20 pt diagonally. Nothing critical in the corners.

## Orientation

Portrait shows a full-screen message: a line of text and a rotate glyph. No partial layout,
no scaled-down keyboard.

## Left-handed option

A settings toggle mirrors the layout horizontally: pump moves to top-right, mixer to
top-left. Keyboard is unchanged.
