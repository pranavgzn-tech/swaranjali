# 08 — Build plan

Four phases. Each ends with a stop. Do not start the next phase without being told.

At the end of every phase: run the matching checklist in `09-acceptance-tests.md`, report
honestly which items pass and which do not, and update `DECISIONS.md`.

---

## Phase 0 — Skeleton (half a session)

- Vite + TypeScript project, `strict: true`, zero runtime dependencies.
- Size-class module: viewport + safe-area insets -> `regular` | `compact-landscape` |
  `compact-portrait`, recomputed on resize, rotate and split-view change.
- iPad portrait shows the rotate message. iPhone portrait routes to companion mode
  (a stub is fine in Phase 0).
- "Tap to begin" overlay that creates and unlocks the AudioContext.
- `src/config/layout.ts` and `src/config/audio.ts` populated with every constant from
  `02-ipad-layout.md` and `03-audio-engine.md`. All of them, now, before any feature code.
- Empty region boxes drawn at the exact geometry for **all three** size classes, so each
  layout can be eyeballed on the real devices.
- `src/config/compact.ts` populated from `11-responsive-layouts.md`.
- PWA manifest, `apple-` meta tags, generated icons and launch screens, and a service
  worker with a build-time precache list. Verify it installs to the home screen on both
  devices, launches with no white flash, and fills the screen.
- Derived band heights from the real viewport insets, per `12-install-fullscreen-offline.md`.
- Aeroplane-mode test: force-quit, relaunch offline, confirm the shell loads.
- **GitHub Pages deployment** via GitHub Actions, so every push produces a URL testable on
  the real devices. Vite `base: './'` — the app must work from a subpath.

**Stop. Show me the layout boxes on both the iPad and the iPhone, in both orientations.**

---

## Phase 1 — The instrument

This is the phase that matters most. Take the time.

1. **Wavetables.** Build the three `PeriodicWave` objects from the harmonic tables. Write a
   tiny debug page that plays each bank alone on a sustained note so you can hear them
   separately.
2. **Voice pool.** 12 voices × 3 bank sub-voices, oscillators running from boot, gated by
   gain. Verify no nodes are created after startup.
3. **Bellows.** The air reservoir simulation with every constant from the spec. Sound must
   die when pumping stops. Verify the timings feel right: roughly 0.55 s to fill, and a
   single held note should drain a full reservoir in about 8–10 seconds.
4. **Body chain.** Cabinet resonances, saturation, generated reverb impulse, limiter.
5. **Keyboard.** 15 white keys on regular, exactly 8 on compact landscape, black keys at
   the specified offsets, full dual labels with komal underlines, tivra overlines and
   register dots. Labels sit at the bottom of the key on regular and at the **top** on
   compact — that difference is deliberate.
6. **Pointer router.** Cached geometry, multi-touch, glissando, panic release.
7. **Pump paddle** with the air reservoir window as the signature element.
8. **Stop mixer.** Faders 1, 2, 3, 4, 9 and master live. Faders 5–8 present but inert,
   visually marked as arriving in Phase 2.
9. **Sa selector** and octave shift.
10. **Settings persistence**, shared across size classes.
11. **Compact landscape layout**: top bar, keyboard, full-width pump strip, stops sheet.
12. **Speaker / headphones profile toggle** and the compact audio constants.
13. **Boot benchmark** that drops to the lite audio tier on a slow device.
14. **IndexedDB store** for recordings, with storage usage shown in settings.
15. **Update flow**: a quiet line in settings when a new build is waiting. Never auto-reload.

**Stop. This must be genuinely playable and must sound like a harmonium on both devices
before we go on.**

---

## Phase 2 — Accompaniment

1. Drone reed stops (faders 5, 6, 7) with the Pa/Ma toggle. They draw air.
2. Tanpura (fader 8): Karplus-Strong with jawari buzz, four-string cycle.
3. Lookahead scheduler.
4. Taal engine: all 13 taals, synthesised tabla bols, tempo 40–240, tap tempo.
5. Matra display with sam and khali marks.
6. Recorder with optional mic mix.
7. Diagnostics panel behind five taps on the version number.
8. **Compact portrait companion mode**: Sa dial, drone and tanpura faders, taal with matra
   dots, recorder, tuner entry point. No keyboard.
9. **Add-to-home-screen banner** on compact viewports running inside Safari.

**Stop.**

---

## Phase 3 — Learning

1. Data files: thaats, 24 ragas, 72 generated melakartas, taals, 18 alankars.
2. `npm run validate-data` wired into the build.
3. Raga browser and raga mode key highlighting.
4. Aroha / avaroha / pakad playback.
5. Alankar trainer with auto-scroll and tempo ramp.
6. Notation renderer and the plain-text notation parser.
7. Composition library — traditional material only, each with provenance.

**Stop.**

---

## Phase 4 — Refinement

1. Shruti / just-intonation tuning with the persistent badge.
2. Devanagari and Carnatic label modes.
3. Voice pitch detection showing the sung swara.
4. Practice log, local only.
5. Left-handed mirror mode.
6. A pass over sound design: sit with it, adjust the harmonic tables and the bellows
   constants by ear, and record what you changed and why.

---

## Working rules across all phases

- Commit at each numbered step with a message describing the behaviour, not the files.
- Never refactor and add a feature in the same commit.
- If a step turns out to be wrong, stop and say so rather than building around it.
- Keep `DECISIONS.md` current. Every judgement call gets one line and a reason.
- Keep `IDEAS.md` for anything you thought of that is not in the spec. Do not build it.
