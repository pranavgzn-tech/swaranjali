# 09 — Acceptance tests

Run these yourself at the end of each phase and report pass or fail honestly, item by item.
A phase with any failing item is not done. "Mostly working" is a fail.

## Every phase

- [ ] `npm run build` completes with zero errors and zero warnings
- [ ] `npm run typecheck` passes under `strict: true`
- [ ] No `console.log` outside the gated debug logger
- [ ] Nothing overflows or overlaps at 1180 × 820 (iPad), 852 × 393 (iPhone landscape) or
      393 × 852 (iPhone portrait)
- [ ] No layout code branches on user agent — only on viewport size class
- [ ] Rotating any device rebuilds hit regions correctly and leaves no stuck notes
- [ ] Works with the network disabled after first load, launched from the home-screen icon
- [ ] Zero runtime network requests — confirmed in the network inspector
- [ ] No runtime dependency was added without asking

## Phase 1 — The instrument

**Sound**
- [ ] With only the male bank up, a held note sounds reedy and slightly buzzy — not like a
      sine, a sawtooth, or an organ preset
- [ ] Two banks together produce audible gentle beating, not a static blend
- [ ] The attack has a soft onset and a faint audible chiff, not a click
- [ ] The release is smooth with a faint key-off thump, no click, no tail cut off
- [ ] Playing the same note twice in a row sounds slightly different each time (drift)
- [ ] Twelve notes held at once do not distort or clip

**Bellows**
- [ ] Sound cannot be produced at all before the first pump
- [ ] A full stroke takes roughly half a second
- [ ] One held note drains a full reservoir in roughly 8–10 seconds
- [ ] Six held notes drain it noticeably faster
- [ ] As pressure falls, the tone dulls and drops in volume before it stops speaking
- [ ] Pumping harder makes the pitch rise very slightly — audible but not more than a few cents
- [ ] Assist mode is off by default and its label explains the trade-off

**Touch**
- [ ] Ten simultaneous keys all sound
- [ ] Sliding a finger across the keyboard retriggers each key in turn
- [ ] Pumping with the left hand and playing with the right works with no interference
- [ ] A note never sticks — test by backgrounding the app mid-note and returning
- [ ] Two-finger pinch does not zoom; double-tap does not zoom; edge drag does not scroll
- [ ] Measured `pointerdown` → schedule time averages under 8 ms in the diagnostics panel

**Labels and layout**
- [ ] Every visible key shows a sargam label and a Western label
- [ ] Komal swaras are underlined; tivra Ma is overlined
- [ ] Register dots appear above and below correctly across the octave shift range
- [ ] Changing Sa immediately relabels every key correctly
- [ ] Labels are legible at arm's length on the device — check this on the device, not a mockup
- [ ] Fader caps can be grabbed and dragged accurately with a thumb
- [ ] Settings survive a full app restart

## Phase 2 — Accompaniment

- [ ] Drone stops sustain correctly and draw air from the reservoir
- [ ] The Pa/Ma toggle changes the drone pitch correctly
- [ ] Tanpura has an audible jawari buzz and an uneven, human pluck interval
- [ ] Taal stays in time for a continuous five minutes with no audible drift
- [ ] Tempo changes take effect at the next matra, not mid-beat
- [ ] The matra counter is exactly in sync with the audio, with sam and khali marked
- [ ] A recording plays back with the same balance that was heard live
- [ ] The mic is never accessed unless the user has turned that toggle on

## Phase 3 — Learning

- [ ] `npm run validate-data` passes and is part of the build
- [ ] Exactly 72 melakartas generate, each with 7 degrees including Sa and Pa
- [ ] Every shipped raga either has verified data or is marked `verified: false` and hidden
      from raga mode
- [ ] Raga mode dims omitted swaras but still lets them sound
- [ ] Aroha and avaroha play back at the set tempo, with the keys lighting in time
- [ ] An alankar transposes correctly into at least three different ragas
- [ ] Notation renders komal, tivra, register dots, vibhag bars, sam and khali correctly
- [ ] Every composition has `publicDomain: true` and a filled-in provenance

## Phase 4 — Refinement

- [ ] Shruti mode applies the correct cent offsets and shows its badge
- [ ] Devanagari labels render correctly with no missing glyph boxes
- [ ] Pitch detection identifies a sung swara correctly across at least an octave
- [ ] Left-handed mode mirrors the top band without breaking any hit regions
