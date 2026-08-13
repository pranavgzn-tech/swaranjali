# CLAUDE.md — project constitution

Read this in full at the start of every session. It overrides your default habits.

## What we're building

A digital harmonium for solo practice of Indian music. Single user, single device, no
accounts, no backend, no network calls at runtime. It must feel like an instrument, not
like a web page with sound in it.

Target devices: **iPad Air 10.9" and iPhone, Safari, installed to the home screen.**
Nothing else matters. Do not spend effort on desktop or Android.

- **iPad:** landscape only. Portrait shows a rotate message.
- **iPhone:** landscape is the instrument; portrait is companion mode (drone, taal,
  notation, recorder) with no keyboard.

`docs/11-responsive-layouts.md` is binding on every layout decision. Never branch on user
agent — always on viewport size class, because iPad Split View produces phone-sized
viewports.

## Stack — fixed, do not substitute

| Concern | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript (strict) | Fast, zero config, static output |
| UI framework | **None** | A re-render in a touch handler costs milliseconds we don't have |
| Rendering | Plain DOM + CSS. Keyboard is DOM elements positioned absolutely. | Cheap hit-testing, crisp text labels |
| Audio | **Raw Web Audio API.** No Tone.js, no Howler, no wrappers. | Full control over the bellows model and voice pooling |
| State | Plain TS modules with a tiny pub/sub. No Redux, no signals library. | |
| Persistence | `localStorage` for settings, **IndexedDB for recordings** (blobs) | |
| Styling | Hand-written CSS with custom properties. No Tailwind, no CSS-in-JS. | |
| Icons | Inline SVG, hand-drawn in the repo | No icon font, no network fetch |
| Deps | Keep total runtime dependencies at **zero** if possible | Every dep is latency risk and offline risk |

If you believe a dependency is genuinely necessary, stop and ask before adding it.

## Hard rules

1. **Never allocate in the audio path.** No `new` inside `pointerdown`, `pointermove`, or
   the scheduler tick. Pre-allocate voice pools at startup. Reuse.
2. **No layout thrash on touch.** Cache key bounding boxes once on resize. Never call
   `getBoundingClientRect()` or `elementFromPoint()` inside a pointer event.
3. **Pointer Events only.** Never `touchstart`/`mousedown`. Track by `pointerId`.
4. **No `async` between touch and sound.** The path from `pointerdown` to
   `gainNode.gain.setValueAtTime()` is synchronous.
5. **All tuning in cents, all pitch as frequency.** Never use MIDI note numbers as the
   source of truth — this instrument has to support non-equal tuning.
6. **Every magic number lives in `src/config/` as a named constant** with a comment saying
   where it came from. The spec docs give you real values. Use them.
7. **No placeholder audio.** Do not ship a sine wave and call it done. If the reed engine
   isn't ready, the phase isn't done.
8. **No lorem ipsum, no fake data, no "TODO: add ragas later".** Seed data ships real.
9. **Zero network requests at runtime.** No CDN fonts, no external assets, no analytics.
   The app must pass every acceptance test in aeroplane mode. If you are writing `fetch()`
   to another origin, stop — see `docs/12-install-fullscreen-offline.md`.
10. **Rebuild cached hit regions on every viewport change** — resize, rotate, split-view
   resize. Stale key rectangles after a rotate is the likeliest bug in this project.
11. **Do not add features that are not in the spec.** No sharing, no cloud sync, no
   gamification, no streaks, no achievements, no AI chat assistant. If you think of a good
   idea, write it in `IDEAS.md` and move on.

## Definition of done for any phase

A phase is done when **all** of these are true:

- `npm run build` produces a clean build with zero TypeScript errors and zero warnings.
- `npm run typecheck` passes with `strict: true`.
- Every acceptance test for that phase in `docs/09-acceptance-tests.md` passes.
- You have physically reasoned through the layout at **1180 × 820** (iPad), **852 × 393**
  (iPhone landscape) and **393 × 852** (iPhone portrait) and confirmed nothing overflows,
  overlaps, or hides under a safe-area inset.
- `DECISIONS.md` records any judgement call you made.
- No `console.log` left in shipped code. A `debug` flag gated logger is fine.

## Code conventions

- Files: `kebab-case.ts`. Types: `PascalCase`. Constants: `SCREAMING_SNAKE`.
- One responsibility per module. If a file passes ~250 lines, it's doing two things.
- Comment the *why*, never the *what*. Physics and music theory constants get a comment
  citing what they represent.
- Public functions get a one-line doc comment. Private helpers don't need one.
- No barrel `index.ts` re-export files.

## Suggested structure

```
src/
  main.ts                  entry, boot sequence, orientation guard
  config/
    layout.ts              all geometry constants in points
    audio.ts               all audio constants
    theme.ts               design tokens mirrored from CSS custom properties
  audio/
    context.ts             AudioContext creation, unlock, wake
    voice-pool.ts          pre-allocated always-running oscillator voices
    reed-bank.ts           the three reed banks and their wavetables
    wavetables.ts          PeriodicWave construction from harmonic tables
    bellows.ts             air reservoir simulation
    body.ts                cabinet resonance, saturation, reverb, limiter
    drone.ts               tanpura and drone reeds
    percussion.ts          taal engine + tabla voices
    recorder.ts            session recording
    scheduler.ts           lookahead clock for taal and exercises
  input/
    pointer-router.ts      pointerId map, hit test, glissando
    hit-regions.ts         cached geometry
  music/
    pitch.ts               frequency maths, cents, tuning systems
    swara.ts               sargam naming, komal/tivra, octave registers
    raga.ts                raga model and queries
    taal.ts                taal model
    notation.ts            Bhatkhande notation parse and render
  ui/
    layouts/
      regular.ts           iPad three-band layout (doc 02)
      compact-landscape.ts phone instrument layout (doc 11)
      compact-portrait.ts  companion mode (doc 11)
    size-class.ts          viewport -> size class, safe-area reads
    keyboard.ts
    pump.ts
    stop-mixer.ts
    transport.ts
    panels/                learn, ragas, taal, settings, recorder
  data/
    thaats.json
    ragas.json
    melakartas.json
    taals.json
    alankars.json
    compositions.json
  state/
    store.ts
    persistence.ts          settings in localStorage
    recordings-db.ts        recordings in IndexedDB
pwa/
  manifest.json
  sw.ts                     precache list injected at build time
scripts/
  gen-precache.ts           walks dist/, writes the precache list
  gen-launch-screens.ts     generates icons and iOS launch images
```

## Tone of the thing

This is a devotional practice instrument, not a toy and not a product demo. Restrained,
warm, quiet when idle. No confetti, no gradients, no bounce animations, no emoji in the UI.
Read `docs/06-visual-design.md` before touching CSS.

## When you're unsure

Ask. One question, batched with others, at a natural stopping point. Do not ask after every
file. Do not silently guess on anything to do with musical correctness — a wrong raga is
worse than no raga.
