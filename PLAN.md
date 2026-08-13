# PLAN.md — how Swaranjali gets built

Written after reading `CLAUDE.md` and `docs/01` through `docs/12` in full. Nothing here
invents a number; every constant cited comes from a doc and is referenced to it.

This plan covers the whole build, but only Phase 0 and Phase 1 are planned to module level,
because those are what I'd build next. Phases 2–4 are sketched so the structure I lay down
now doesn't have to be torn up later.

---

## 1. Stack and ground rules I'm building to

- Vite + TypeScript, `strict: true`, `base: './'` so GitHub Pages subpaths work.
- **Zero runtime dependencies.** Dev dependencies: `vite`, `typescript`, and nothing else
  unless I stop and ask first.
- No UI framework. Plain DOM, absolutely positioned keys, cached geometry.
- Raw Web Audio. No Tone.js, no wrappers.
- Hand-written CSS with custom properties. No Tailwind.
- Settings in `localStorage`; recordings in IndexedDB.
- Every magic number lives in `src/config/` with a comment citing its source doc.

---

## 2. Folder structure

Following the suggested structure in `CLAUDE.md`, with a few additions noted and justified
underneath.

```
index.html
vite.config.ts
tsconfig.json
package.json
PLAN.md  DECISIONS.md  IDEAS.md  CLAUDE.md  README.md  PROMPT.md
docs/                        01 … 12, unchanged
.github/workflows/pages.yml  build + deploy to GitHub Pages on push to main

public/
  manifest.json              generated icons land beside it at build time

src/
  main.ts                    boot sequence, size-class routing, layout mount/teardown
  boot/
    tap-to-begin.ts          overlay; creates + unlocks AudioContext on first gesture
    warmup.ts                wavetables, reverb impulse, voice pool — built behind the overlay
    benchmark.ts             times warmup, drops to the lite audio tier if slow (doc 11)

  config/
    layout.ts                iPad geometry — doc 02, verbatim
    compact.ts               COMPACT_LANDSCAPE + portrait geometry — doc 11, verbatim
    audio.ts                 HARMONICS, BELLOWS, BODY, REVERB, LIMITER, attack table — doc 03
    compact-audio.ts         COMPACT_AUDIO, SPEAKER_PROFILE — doc 11
    theme.ts                 design tokens mirrored from CSS custom properties — doc 06
    derive.ts                MIXER_DERIVED and band-height derivation — doc 12

  audio/
    context.ts               AudioContext creation, unlock, resume, visibilitychange
    wavetables.ts            PeriodicWave from HARMONICS, seeded pseudo-random phases
    tone-source.ts           the ToneSource interface (doc 03) + SynthReedSource
    voice-pool.ts            12 voices (8 compact) × 3 bank sub-voices, running from boot
    reed-bank.ts             per-bank filter, gain, detune, drift LFO, attack/scoop table
    chiff.ts                 attack noise burst + key-off thump
    bellows.ts               air reservoir simulation, rAF-driven, pressure → params
    body.ts                  3 peaking EQ, high shelf, tanh shaper, reverb, limiter
    mixer.ts                 nine stop gains + master, value^2.2 curve, coupler routing
    speaker-profile.ts       highpass + presence, toggled by the settings switch
    drone.ts                 Phase 2
    tanpura.ts               Phase 2
    percussion.ts            Phase 2
    scheduler.ts             Phase 2
    recorder.ts              Phase 2

  input/
    hit-regions.ts           cached key rectangles, rebuilt on every viewport change
    pointer-router.ts        one container listener, pointerId map, glissando, panic release

  music/
    pitch.ts                 cents ↔ ratio, degree + saptak + Sa + A4 → frequency
    swara.ts                 sargam naming, komal/tivra, register, label strings
    raga.ts                  Phase 3
    taal.ts                  Phase 2/3
    notation.ts              Phase 3

  ui/
    size-class.ts            visualViewport − safe insets → SizeClass (doc 11 function)
    layouts/
      regular.ts             iPad three-band layout (doc 02)
      compact-landscape.ts   phone instrument layout (doc 11)
      compact-portrait.ts    companion mode (doc 11) — stub in Phase 0
      rotate-message.ts      iPad portrait
    keyboard.ts              key DOM build, label rendering, press/sound visual state
    pump.ts                  paddle + the air reservoir window (the signature element)
    stop-mixer.ts            faders, drag handling, hit padding
    transport.ts             Sa selector, octave shift, menu button
    stops-sheet.ts           compact pull-down stops sheet
    panels/settings.ts       settings panel; later: learn, ragas, taal, recorder
    install-banner.ts        one-time add-to-home-screen banner on compact-in-Safari

  state/
    store.ts                 plain module + tiny pub/sub
    settings.ts              Settings type, defaults, debounced persist, version migration
    recordings-db.ts         IndexedDB wrapper

  styles/
    tokens.css  base.css  keyboard.css  mixer.css  pump.css  panels.css

  data/                      Phase 3 — thaats, ragas, melakartas, taals, alankars

pwa/
  sw.ts                      precache list injected at build time

scripts/
  gen-icons.ts               icons 180/192/512/512-maskable from one source
  gen-launch-screens.ts      apple-touch-startup-image set (doc 12 device table)
  gen-precache.ts            walks dist/, writes the hashed precache list
  validate-data.ts           Phase 3 — data validation, wired into build
```

**Additions to the structure in `CLAUDE.md`, and why:**

| Added | Reason |
|---|---|
| `boot/` | The "Tap to begin" screen has real work behind it — unlock, warmup, benchmark. That's three responsibilities, not one, and `main.ts` shouldn't hold them (250-line rule). |
| `config/derive.ts` | Doc 12 says band heights must be derived from real insets, not hard-coded. That derivation is logic, so it doesn't belong in a constants file. |
| `config/compact-audio.ts` | Doc 11's audio constants are a separate concern from the reed/bellows constants; keeping them apart makes the lite tier a single import swap. |
| `audio/mixer.ts`, `audio/chiff.ts`, `audio/speaker-profile.ts` | Splitting these out of `body.ts` keeps each file to one job. |
| `styles/` split by region | One CSS file would be past 250 lines before the keyboard is done. |

**Icons and launch screens — the one real risk in this plan.** Docs 06 and 12 want PNG icons
and launch images generated at build time from a single source, and Node has no image
encoder built in. Rasterising a PNG with zero dependencies is awkward but not hard for what
we need: these images are a flat `--wood-deep` background with a simple mark on it, so I'll
write a small PNG encoder in `scripts/` — raw pixel buffer, `node:zlib` for the deflate, CRC
per chunk. That's about 80 lines and no dependency. If the result looks poor at 180 px I'll
stop and ask whether to add `sharp` as a **dev-only** dependency, rather than sneak one in.
Runtime dependencies stay at zero either way.

---

## 3. Module responsibilities — the ones that carry the design

**`ui/size-class.ts`** — the only place that decides what layout runs. Reads
`visualViewport` minus safe-area insets, applies doc 11's `sizeClass()` verbatim, and fires
a change event on `resize`, `orientationchange` and `visualViewport.resize`. Never reads the
user agent. Everything downstream subscribes.

**`input/hit-regions.ts`** — owns the cached rectangles and nothing else. Exposes
`rebuild(geometry)` and `keyAt(x, y)` implemented as the pure arithmetic in doc 05: black
keys tested first, white index by `Math.floor(x / whiteW)`. No DOM reads at all, so
`getBoundingClientRect()` can't leak into a pointer handler. `rebuild()` is called on every
size-class or viewport change — doc 02 and doc 11 both name stale rectangles as the most
likely bug in the project, so this module is deliberately tiny and easy to audit.

**`input/pointer-router.ts`** — one set of listeners on the stage container.
`Map<pointerId, KeyId>`. On move, if `keyAt()` differs from the pointer's current key,
note-off then note-on in the same tick (glissando). No `setPointerCapture`. `pointercancel`
and pointer-leaves-region both release. Panic release on `visibilitychange`, `blur`,
`statechange → suspended`, and rotation. Path from `pointerdown` to
`gain.setValueAtTime()` is synchronous, with no allocation.

**`audio/voice-pool.ts`** — allocates everything at warmup: 12 voices (8 on the lite tier),
each owning three bank sub-voices, each with permanently running oscillators, filter and
gain. `noteOn` retunes and ramps; `noteOff` ramps to zero. Voice stealing takes the oldest
note, never a physically held one. I'll add a debug assertion that counts node creation
after warmup so "no nodes created during play" is verified, not assumed.

**`audio/bellows.ts`** — the reservoir simulation from doc 03, ticked from one rAF loop,
budgeted under 1 ms. Holds pressure, applies `pumpRate` scaled 0.6×–1.4× by paddle travel,
subtracts `passiveLeak` + `drawFirstNote` + `drawEachExtra` per extra note, weighted by
`bankDraw` × fader level. Publishes pressure; `reed-bank.ts`, `body.ts` and `ui/pump.ts` all
read from it. Writes to audio params use short ramps, never steps. Below `speakThreshold`
the reeds stop speaking over `fadeOutMs`.

**`audio/tone-source.ts`** — the `ToneSource` interface from doc 03 exactly as written, so
`SampledReedSource` can be dropped in later without touching bellows, mixer, body or reverb.

**`state/settings.ts`** — the `Settings` interface from doc 07, `version: 1`, debounced
400 ms, migrated by version, never silently dropped. Shared across size classes, so
rotating a phone or entering Split View preserves Sa, tuning, faders and reference pitch.

**`ui/keyboard.ts`** — builds key elements once per layout mount. Press feedback is a class
toggle on a cached element reference; nothing re-renders. Labels: sargam primary (26 pt
regular / 19 pt compact), Western secondary (15 / 11), komal underlined, tivra Ma overlined,
register dots as CSS pseudo-elements — not Unicode combining marks, per doc 04. Labels at
the **bottom** on regular, at the **top** on compact; doc 11 is explicit that this
difference is intentional, so it's encoded as a layout parameter, not an accident.

---

## 4. Build order

### Phase 0 — Skeleton

| # | Step | Done when |
|---|---|---|
| 0.1 | Vite + TS scaffold, strict, `base: './'`, npm scripts (`dev`, `build`, `typecheck`) | `npm run build` clean, zero deps |
| 0.2 | `index.html` head tags from doc 12, the `touch-action`/`overscroll` CSS block from doc 05, gesture + dblclick preventDefault | pinch, double-tap and edge drag all inert |
| 0.3 | `config/layout.ts`, `config/compact.ts`, `config/audio.ts`, `config/compact-audio.ts`, `config/theme.ts`, `config/derive.ts` — **every constant from docs 02, 03, 11, 12, now** | no feature code before this lands |
| 0.4 | `ui/size-class.ts` + safe-area inset reads | correct class at 1180×820, 852×393, 393×852, and iPad Split View |
| 0.5 | Empty region boxes at exact geometry for all three size classes; iPad portrait rotate message; portrait companion stub | you can eyeball all three on the real devices |
| 0.6 | Tap-to-begin overlay, AudioContext create + unlock + silent buffer | context reaches `running` on both devices |
| 0.7 | Manifest, generated icons, launch screens, service worker + `gen-precache.ts` | installs, no white flash, fills the screen |
| 0.8 | GitHub Actions → GitHub Pages | every push gives you a URL |
| 0.9 | Aeroplane-mode test: force-quit, relaunch offline | shell loads with no network |

**Stop.** I send you the URL and a short list of what to look at, per orientation, per
device.

### Phase 1 — The instrument

Built in the order doc 08 gives, because each step depends on the one before. One commit per
numbered step, describing behaviour rather than files; no refactor mixed into a feature
commit.

1. Wavetables + a debug page that plays each bank alone on a sustained note.
2. Voice pool, oscillators running from boot, node-creation assertion.
3. Bellows — verify ~0.55 s to fill, one held note draining a full reservoir in 8–10 s.
4. Body chain: resonances, saturation, generated reverb impulse, limiter.
5. Keyboard: 15 white on regular, exactly 8 on compact landscape, black offsets from doc 02,
   full dual labels.
6. Pointer router: cached geometry, multi-touch, glissando, panic release.
7. Pump paddle with the air-reservoir window.
8. Stop mixer: faders 1, 2, 3, 4, 9 and master live; 5–8 present but inert and marked as
   Phase 2.
9. Sa selector and octave shift.
10. Settings persistence shared across size classes.
11. Compact landscape layout: top bar, keyboard, full-width pump strip, stops sheet.
12. Speaker / headphones toggle and the compact audio constants.
13. Boot benchmark → lite tier.
14. IndexedDB store with storage usage in settings.
15. Update flow: quiet line in settings, never auto-reload.

**Stop.** Then I walk you through the Phase 1 checklist in `docs/09` — including the eight
additions doc 11 asks to be added to it — question by question, because the sound and
legibility items need your ears and eyes, not my assertion.

### Phases 2–4

As doc 08 lays them out: accompaniment (drone, tanpura, taal, recorder, diagnostics,
companion mode, install banner), then learning (data files, validation, raga mode, alankars,
notation, compositions), then refinement (shruti, label modes, pitch detection, practice log,
left-handed mirror, a sound-design pass by ear). Each ends with a stop.

---

## 5. What I'll verify at each stop, and what only you can

I can verify: builds clean, typecheck strict, no `console.log`, no runtime deps, geometry
arithmetic at 1180×820 / 852×393 / 393×852, no user-agent branching, hit regions rebuilt on
viewport change, no nodes created after warmup, no cross-origin requests in the source.

Only you can verify, from the device: whether it sounds like a wooden harmonium rather than
a synth, whether the beating between banks is audible, whether the attack chiffs rather than
clicks, whether labels are legible at arm's length, whether the pump feels right under a
resting left hand, and whether latency feels instant. Doc 09 is how I'll ask — as specific
questions you can answer by playing, not as boxes I tick myself.

---

## 6. Three things I need from you before I start

1. **Branch.** `PROMPT.md` says commit straight to `main`. This session was opened with a
   standing instruction to develop and push on `claude/swaranjali-spec-setup-gfp5y1`, and I
   won't push to a different branch without you saying so. Tell me which you want. If it's
   `main`, GitHub Pages deploys on every push exactly as `PROMPT.md` intends; if it's the
   feature branch, I'll point the Pages workflow at that branch instead so you still get a
   testable URL, and you can merge when you like.

2. **The icon.** Docs 06 and 12 want icons and launch screens generated from one source with
   `--wood-deep` behind them, but nothing specifies the mark itself. Unless you'd rather
   describe one, I'll draw a simple brass-on-rosewood glyph — a stylised anjali/cupped-palm
   form — as inline SVG, and record it in `DECISIONS.md`.

3. **Fonts.** Doc 06 asks for a self-hosted humanist serif for sargam and a humanist sans
   for UI, and doc 10 makes licensing my call to check and record. I'll use open,
   redistributable faces (SIL OFL), subset them, self-host as WOFF2, and write the licence
   into `DECISIONS.md`. Say if you have a face in mind.

None of these block me writing code except the first.

---

## 7. Two notes on the spec

Neither is a problem, both are worth saying out loud rather than silently working around:

- `PROMPT.md` says "all ten docs in `docs/`". There are twelve. Docs 11 and 12 were clearly
  added after that line was written, and both are substantial — doc 11 is binding on every
  layout decision per `CLAUDE.md`. I've read all twelve and I'm treating all twelve as
  current.
- `docs/02` gives the mixer geometry as fixed points at a zero top inset, while `docs/12`
  says to treat those as ratios of a 300 pt band and derive them at runtime. Doc 12 wins;
  doc 02 says so itself. The doc-02 values go into `config/layout.ts` as the reference
  constants, and `config/derive.ts` derives the live values from them.

---

**Waiting for your go before writing any code**, per `PROMPT.md` step 1. Answer question 6.1
and I'll start Phase 0.
