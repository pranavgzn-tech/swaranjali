# 01 — Product spec

## The one-sentence version

A digital harmonium that a solo learner plays with the right hand while pumping with the
left, on an iPad, to learn Indian music and to accompany their own singing.

## Who uses it

One person. A beginner teaching themselves harmonium and Indian vocal music from scratch,
with no teacher in the room. They will use it daily for 20–60 minutes. They intend to buy
a real harmonium later, so nothing here should teach a habit that has to be unlearned.

This has a direct design consequence: **the app must model real bellows behaviour, not fake
it.** If you stop pumping, the sound must die. Free sustain would teach the wrong reflex.
An "assist" mode exists for singing practice, but it is off by default and clearly labelled.

## The three things it must do well

1. **Be an instrument.** Instant, expressive, no lag, no menus in the way.
2. **Sound like a wooden harmonium.** Warm, reedy, slightly buzzy, with a body to it.
3. **Teach Indian music.** Sargam labels, ragas, taals, and notation are first-class, not
   an add-on panel.

## Scope by phase

Build in this order. Do not jump ahead. Full detail in `08-build-plan.md`.

### Phase 1 — The instrument
- Keyboard, 2 octaves visible, octave shift
- Pump with real air reservoir
- Three reed banks (bass / male / female) as faders
- Coupler
- Master volume, reverb
- Dual key labels: sargam + Western
- Sa selector
- Settings persist

### Phase 2 — Accompaniment
- Drone stops (Sa low, Sa high, Pa/Ma selectable)
- Tanpura with jawari buzz
- Taal engine with tabla, tempo control, matra display
- Recorder — capture the instrument, optionally mixed with the mic

### Phase 3 — Learning
- Raga browser: 10 thaats, ~24 named ragas, all 72 melakartas
- Raga mode: allowed swaras lit, forbidden dimmed, aroha/avaroha/pakad playable
- Alankar trainer with auto-scrolling sargam and tempo ramp
- Notation viewer in Bhatkhande style
- Composition library (traditional material only)

### Phase 4 — Refinement
- Just-intonation / shruti tuning per raga
- Voice pitch display (shows which swara you are singing)
- Devanagari sargam labels
- Practice log, local only

## Explicitly out of scope

No accounts. No cloud. No sharing. No leaderboards. No streaks or badges. No in-app
purchases. No analytics. No AI chat. No MIDI. No multi-user. No song downloads.

## Non-negotiables

- Works fully offline after first load.
- Landscape only.
- Every key on screen is labelled, always, legibly.
- Nothing in the interface blocks the keyboard while playing.
