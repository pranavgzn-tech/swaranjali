# 04 — Indian music model

This is the doc that makes it an Indian instrument rather than a keyboard with a reed sound.
Musical correctness matters more than features. A wrong raga is worse than a missing one.

## Swaras

Seven natural (shuddh) swaras, five altered. Hindustani naming:

| Degree | Semitone from Sa | Hindustani | Short | Type |
|---|---|---|---|---|
| 1 | 0 | Sa (Shadja) | S | fixed |
| 2♭ | 1 | komal Re | r | komal |
| 2 | 2 | Re (Rishabh) | R | shuddh |
| 3♭ | 3 | komal Ga | g | komal |
| 3 | 4 | Ga (Gandhar) | G | shuddh |
| 4 | 5 | Ma (Madhyam) | m | shuddh |
| 4♯ | 6 | tivra Ma | M | tivra |
| 5 | 7 | Pa (Pancham) | P | fixed |
| 6♭ | 8 | komal Dha | d | komal |
| 6 | 9 | Dha (Dhaivat) | D | shuddh |
| 7♭ | 10 | komal Ni | n | komal |
| 7 | 11 | Ni (Nishad) | N | shuddh |

Sa and Pa never vary. That is why they are called achal (immovable).

**Carnatic naming** must also be supported as a display toggle: S, R1, R2, R3, G1, G2, G3,
M1, M2, P, D1, D2, D3, N1, N2, N3 — where R3/G1 and D3/N1 share pitches (3 and 8 semitones).
Map by melakarta context where known, otherwise default R1=1, R2=2, G2=3, G3=4, M1=5, M2=6,
D1=8, D2=9, N2=10, N3=11.

**Devanagari** as a third label option: सा रे ग म प ध नि.

## Octave registers (saptak)

| Register | Notation | Display |
|---|---|---|
| Mandra (low) | dot below the swara | `S̥` or a rendered dot |
| Madhya (middle) | plain | `S` |
| Taar (high) | dot above | `Ṡ` |

Render the dots with CSS pseudo-elements, not Unicode combining characters — combining
marks position badly across iOS font fallbacks.

## Key labels — required on every key

Each key shows two labels, stacked:

- **Primary (large, ~26 pt):** sargam relative to the chosen Sa, with register dot.
- **Secondary (small, ~15 pt, dimmed):** Western note name and octave, e.g. `C4`.

Komal swaras are shown with an **underline** beneath the letter. Tivra Ma is shown with a
**short vertical line above** it. That is Bhatkhande's convention and it is what the user
will see in every book they buy.

A settings toggle switches the primary label between Hindustani, Carnatic, Devanagari, or
Western-only. Labels never disappear.

## Sa selection and the scale changer

The user picks which physical key is Sa. Two modes:

- **Absolute (default):** Sa maps to a real pitch (C, C♯, D … B). Choosing D means Sa sounds
  at D. This is what a scale-changer harmonium does mechanically.
- **Fixed-position:** the leftmost white key is always Sa, whatever pitch it sounds. Faster
  for a learner but does not match a real keyboard. Off by default.

Reference pitch A4 defaults to **440 Hz**, adjustable **415–466 Hz** in 0.5 Hz steps, so the
user can tune to a recording or another instrument.

## Tuning systems

**12-TET (default).** A real harmonium is equal-tempered, and that is a well-known
compromise Indian musicians live with. Ship this as the default so the user's ears match
what a real instrument will do.

**Shruti / just intonation (Phase 4, optional).** Per-swara cent offsets from equal
temperament, applied relative to Sa:

| Swara | Ratio | Cents | Offset from 12-TET |
|---|---|---|---|
| S | 1/1 | 0 | 0 |
| r | 16/15 | 111.7 | +11.7 |
| R | 9/8 | 203.9 | +3.9 |
| g | 6/5 | 315.6 | +15.6 |
| G | 5/4 | 386.3 | −13.7 |
| m | 4/3 | 498.0 | −2.0 |
| M | 45/32 | 590.2 | −9.8 |
| P | 3/2 | 702.0 | +2.0 |
| d | 8/5 | 813.7 | +13.7 |
| D | 5/3 | 884.4 | −15.6 |
| n | 16/9 | 996.1 | −3.9 |
| N | 15/8 | 1088.3 | −11.7 |

When shruti mode is on, show a small persistent badge saying so. The user must never be
confused about why the app sounds different from their harmonium.

## Thaats

All ten Bhatkhande thaats ship as data. Each is a parent scale of twelve semitone flags.

| Thaat | Swaras |
|---|---|
| Bilawal | S R G m P D N |
| Khamaj | S R G m P D n |
| Kafi | S R g m P D n |
| Asavari | S R g m P d n |
| Bhairavi | S r g m P d n |
| Bhairav | S r G m P d N |
| Kalyan | S R G M P D N |
| Marwa | S r G M P D N |
| Poorvi | S r G M P d N |
| Todi | S r g M P d N |

## Ragas

Ship at least these 24, hand-written and checked. Do not invent ragas or guess pakads — if
you are unsure of a detail, mark the field `null` and flag it to me rather than filling it
with something plausible.

Yaman, Bhairav, Bhupali, Bhairavi, Kafi, Khamaj, Des, Bilawal, Asavari, Bageshri, Malkauns,
Darbari Kanada, Marwa, Puriya Dhanashri, Todi, Miyan ki Malhar, Jaunpuri, Kedar, Hamsadhwani,
Charukeshi, Vrindavani Sarang, Tilak Kamod, Jog, Ahir Bhairav.

Each raga record carries: thaat, aroha, avaroha, pakad, vadi, samvadi, varjit swaras, jati,
time of day, and a one-line character note.

**Raga mode** in the UI: allowed swaras render normally, omitted swaras dim to 30% and
their labels grey out. They still play — this is a guide, not a lock. A small strip above
the keyboard shows aroha and avaroha, tappable to hear them played at a set tempo.

## Melakartas (Carnatic)

All 72 melakarta ragas, generated programmatically from the katapayadi scheme rather than
typed by hand — the generation rule is deterministic and less error-prone than a table.
Each melakarta gets its number, name, chakra, and the six-swara set. Janya ragas are out of
scope; note that clearly in the UI so it does not look like an omission.

## Taals

| Taal | Matras | Vibhag | Sam / Tali / Khali | Tradition |
|---|---|---|---|---|
| Teentaal | 16 | 4-4-4-4 | ×1, 2:5, 0:9, 3:13 | Hindustani |
| Ektaal | 12 | 2-2-2-2-2-2 | ×1, 2:3, 0:5, 3:7, 0:9, 4:11 | Hindustani |
| Jhaptaal | 10 | 2-3-2-3 | ×1, 2:3, 0:6, 3:8 | Hindustani |
| Rupak | 7 | 3-2-2 | 0:1, 1:4, 2:6 (starts on khali) | Hindustani |
| Keherwa | 8 | 4-4 | ×1, 0:5 | Light / bhajan |
| Dadra | 6 | 3-3 | ×1, 0:4 | Light / bhajan |
| Bhajani | 8 | 4-4 | ×1, 0:5 | Devotional |
| Deepchandi | 14 | 3-4-3-4 | ×1, 2:4, 0:8, 3:11 | Semi-classical |
| Chautaal | 12 | 2-2-2-2-2-2 | ×1, 2:3, 0:5, 3:7, 4:9, 0:11 | Dhrupad |
| Adi | 8 | 4-2-2 | — | Carnatic |
| Rupaka | 6 | 2-4 | — | Carnatic |
| Misra Chapu | 7 | 3-4 | — | Carnatic |
| Khanda Chapu | 5 | 2-3 | — | Carnatic |

Each taal stores its bol sequence. Tempo range **40–240 BPM** with a tap-tempo button.
Display: a row of matra dots, the current one lit, sam marked with ×, khali with 0.

Keherwa, Dadra and Bhajani are the ones a bhajan singer needs most. Make them the first
three in the list.

## Alankars (palte)

At least 18 standard patterns, expressed as scale-degree sequences so they transpose into
any raga automatically. Examples:

```
S R G m P D N Ṡ                          (aroha)
S R G, R G m, G m P, m P D, P D N, D N Ṡ (three-note ascending)
S G R m G P m D P N D Ṡ                  (skip pattern)
S R G m P D N Ṡ / Ṡ N D P m G R S        (up and down)
```

The trainer plays them with a metronome or taal, highlights the current swara, auto-scrolls,
and can ramp tempo up over repetitions.

## Notation

Bhatkhande style, rendered in HTML:

- Swaras in a row, spaced by matra.
- Vibhag separated by a single vertical bar `|`, avartan by a double bar `||`.
- Sam marked `×` above, khali `0`, talis numbered.
- Komal underlined, tivra Ma overlined, register dots above or below.
- Lyrics on a second line beneath, aligned to the matra grid.
- Two swaras in one matra are written joined beneath a small arc.

Parser input format — keep it plain text so the user can type their own:

```
taal: keherwa
tempo: 80
| S  R  G  m | P  P  D  P |
  ra ghu pa ti  ra  ghav  ra
```

## Composition library — copyright

Ship only material that is **traditional and long out of copyright**: sargam exercises,
alankars, raga aroha/avaroha, and traditional devotional songs whose words and melodies are
centuries old. Nothing composed in the last hundred years. Nothing from film. No lyrics
copied from a website — traditional texts only, and note the source in the data file.

If in doubt about any item, leave it out and tell me. I would rather have twelve songs I can
legally keep than forty I cannot.
