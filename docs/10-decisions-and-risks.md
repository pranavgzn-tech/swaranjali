# 10 — Decisions, trade-offs, and honest limits

Read this before starting. It is here so nobody is surprised later.

## Things this app genuinely cannot do

**It will not sound exactly like a Paul & Co.** We are synthesising a free reed from a
harmonic model. That gets you a convincing, warm, reedy harmonium — but a specific
workshop's instrument has a specific character that comes from its reed brass, its wood,
its age and its tuning. Closing that last gap needs recordings of that actual instrument.
The engine is built behind a `ToneSource` interface so samples can be dropped in later
without touching the bellows, mixer, or effects.

**The keys are smaller than real keys.** 15.1 mm versus about 21 mm on the default setting.
That is a hard consequence of a 227 mm screen. Finger memory built here will transfer
roughly but not exactly. The Wide keyboard mode (11 keys at 20.6 mm) matches real size
almost perfectly and is the better choice for anyone specifically training for a real
instrument — at the cost of range.

**Two octaves visible instead of three and a half.** Octave shift covers the rest, but you
cannot reach across the full range with one hand the way you can on the real thing.

**No pressure sensitivity from the screen.** This does not matter — a real harmonium has no
key velocity either. Volume comes from the bellows, which we do model. This is one place
where the physical instrument and the digital one genuinely agree.

**No external keyboard.** iOS Safari has no Web MIDI. A USB or Bluetooth MIDI keyboard
cannot drive this app. If that ever becomes important, it means building a native app.

**No haptics.** iOS Safari does not expose vibration to web pages.

**Bluetooth audio is unusable.** Roughly 150 ms of latency. Speakers or wired headphones only.

## Decisions made for you, and why

**Web app, not native.** Native Swift would give lower audio latency and MIDI support. But
the goal is to find out whether this art form is worth committing to, and a web app gets
there in days instead of weeks, runs from a URL, and needs no developer account. If the
harmonium sticks, a native rebuild is a reasonable second project.

**No UI framework.** A React re-render inside a touch handler costs milliseconds that
directly become audible lag. For an instrument, plain DOM with cached geometry is not a
shortcut — it is the correct engineering choice.

**Synthesis before samples.** A sample library is the higher ceiling but it needs sourcing,
licensing, looping and multi-sampling before you hear a single note. Synthesis gets a
playable instrument in Phase 1 and can be replaced later.

**Real bellows physics, on by default.** The tempting shortcut is to let notes sustain
freely. That would teach a reflex that has to be unlearned on a real instrument. The assist
mode exists for singing practice, but it is opt-in and honestly labelled.

**Equal temperament by default.** Real harmoniums are equal-tempered. Shipping just
intonation as the default would sound more "correct" in theory and would mislead the ear
about what a real instrument does.

## Open questions to raise, not guess

1. **Tabla realism.** Synthesised tabla is hard to make convincing. If the Phase 2 attempt
   sounds poor, stop and say so rather than shipping it. The alternative is sourcing CC0 or
   CC-BY tabla samples, which is a licensing decision to make deliberately.

2. **Composition material.** Only traditional, long-out-of-copyright words and melodies
   ship. If you are uncertain about any item, leave it out and flag it. Twelve songs that
   are definitely fine beats forty that are not.

3. **Font licensing.** Whatever display face you choose must be redistributable and
   self-hostable. Check the licence and record it in `DECISIONS.md`.

4. **Carnatic janya ragas.** Out of scope. Say so plainly in the UI so it reads as a
   boundary rather than an omission.

## Things worth adding that are not obvious

These are already in the spec, but they are the ones a first draft usually forgets:

- **Sa selection.** Non-negotiable for a singer. The whole instrument transposes to fit the
  voice, and every label follows.
- **Sargam labels tied to Sa**, not fixed Western names. This is what makes it an Indian
  instrument.
- **A recorder that can capture the voice alongside the instrument.** Self-teaching without
  a teacher means being your own ear. Listening back is where most of the learning happens.
- **Taal loops** — Keherwa, Dadra, Bhajani first. Devotional singing lives on these.
- **Guided Access advice** in the settings help. One paragraph that saves hours of
  interrupted practice.
- **Wake Lock.** The screen sleeping mid-practice is maddening.
- **A wrong-note-friendly raga mode.** Dim omitted swaras, never lock them out. Learners
  need to hear the note that does not belong in order to understand why.

## What to do when the spec is wrong

Say so. Do not build a workaround silently. The numbers here are considered starting values,
not laws of physics — particularly the bellows constants and the harmonic tables, which
should be tuned by ear during Phase 4. But change them deliberately, record it, and say why.
