# 06 — Visual design

## The name

**Swaranjali** — an offering of notes. Whatever the interface says or does should sit
comfortably under that word. If a decision feels like it belongs to a product rather than
to a practice, it is the wrong decision.

## The brief in one line

A well-made instrument sitting on a low table in a quiet room at dawn. Restrained, warm,
handmade. It should look like an object you would keep, not an app you would download.

## What to avoid

- Cartoon skeuomorphism. No glossy plastic wood-grain textures, no drop-shadowed fake screws.
- Flat material-design pastels. This is not a productivity app.
- Cream background with a terracotta accent and a high-contrast serif. That combination is
  the default look and it belongs to nothing.
- Gradients as decoration. Gradients here only ever describe a curved physical surface.
- Emoji, badges, confetti, bounce easing.

## Palette

Named tokens. Use only these.

```css
:root {
  --wood-deep:    #2A1A12;  /* cabinet shadow, app background */
  --wood-body:    #4A2E1D;  /* main rosewood body */
  --wood-lit:     #6B452C;  /* top surfaces catching light */
  --brass:        #B8874A;  /* hardware, fader caps, active states */
  --brass-bright: #E0AE6B;  /* the sounding / active accent */
  --ivory:        #EDE4D2;  /* white keys */
  --ivory-dim:    #C9BCA4;  /* white key shadow edge */
  --ebony:        #171310;  /* black keys */
  --cloth:        #4A1F2B;  /* bellows / pump surface, deep maroon */
  --ink:          #1A1512;  /* label text on light surfaces */
  --ink-soft:     #8C7A63;  /* secondary labels */
  --paper:        #E8DCC4;  /* notation panel background */
}
```

Contrast rule: every label must clear 4.5:1 against its own surface. Sargam on ivory keys
uses `--ink`. Sargam on ebony keys uses `--ivory`. Check both.

## Type

- **Display / sargam labels:** a humanist serif with real weight — something with warmth and
  a calligraphic edge. Load one weight only, self-hosted as WOFF2. Do not use a Google Fonts
  CDN link; the app must work offline.
- **UI / body:** a clean humanist sans at 400 and 600.
- **Devanagari:** Noto Sans Devanagari, self-hosted, subset to the sargam glyphs only.
- **Numerals in the taal counter:** tabular figures, always.

Scale, in points:

| Role | Size | Weight |
|---|---|---|
| Sargam key label | 26 | 600 |
| Western key label | 15 | 400 |
| Fader label | 13 | 600, letterspaced 0.08em, uppercase |
| Panel heading | 21 | 600 |
| Body | 16 | 400 |
| Matra counter | 32 | 600, tabular |

## Materials

Build surfaces from layered CSS, not images:

- **Wood:** a base fill plus two very low-opacity repeating linear gradients at slightly
  different angles for grain, plus a soft inner shadow at the edges. Keep grain under 4%
  opacity or it looks like a texture pack.
- **Keys:** a 1 pt lighter top edge, a 2 pt darker bottom edge, and a soft shadow cast onto
  the key to the right. When pressed, the key translates down 3 pt, its top highlight
  disappears, and the shadow tightens.
- **Brass:** a subtle vertical gradient from `--brass` to a darker mix, with a single
  1 pt bright top line. That one line does most of the work.
- **Pump paddle:** `--cloth` with a fine woven texture from a repeating conic gradient at 3%
  opacity, plus a brass-edged grip.

## The signature element

**The air reservoir.** A thin brass-framed horizontal window along the bottom edge of the
pump paddle, showing the current air level as a rising and falling body of warm light
rather than a bar chart. It breathes with the pumping. When the air runs low, the light
dims and cools; when it is full, it sits steady and warm.

This is the one place to spend visual effort. Everything else stays quiet.

## Motion

- Key press: 60 ms, `cubic-bezier(.2,.8,.3,1)`, transform only.
- Fader drag: no transition at all. It must track the finger exactly.
- Air reservoir: continuous, driven by the same `requestAnimationFrame` loop as the physics.
- Panels: 180 ms slide plus fade. Nothing longer.
- Sounding key: the brass-bright accent fades in over 40 ms along the key's bottom edge.
  No glow, no pulse.
- Respect `prefers-reduced-motion`: keep key press feedback (it is functional), drop panel
  transitions.

## Idle state

When nothing has been touched for 45 seconds, panels dim slightly and the reservoir light
settles. Nothing moves. No screensaver, no animation. The instrument simply rests.

## Copy

- Sentence case. Plain verbs. No exclamation marks.
- Name things the way a musician would: "Stops", not "Sound settings". "Sa", not "Root note".
  "Taal", not "Rhythm". "Pump", not "Bellows control".
- The action's name stays the same everywhere it appears.
- Settings explanations are one sentence and explain the consequence, not the mechanism.
  Good: "Assist keeps the air full so you can use both hands to sing. A real harmonium will
  not do this." Bad: "Enable pressure floor override."
