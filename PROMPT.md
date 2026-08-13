# Kickoff prompt

Paste everything below the line into Claude Code as your first message.

---

I'm building a digital harmonium for my own practice. It runs in the browser on an iPad Air
with a 10.9" screen, in landscape, installed to the home screen as a PWA. I'm teaching
myself harmonium and Indian vocal music, and this is the instrument I'll practise on daily
before I buy a real one.

**First, tidy the repo.** The spec files were uploaded from a phone and are all sitting in
the root. Move the twelve numbered docs into `docs/`, leave `CLAUDE.md`, `README.md` and
`PROMPT.md` in the root, and commit that as a single change before anything else.

Everything you need is then in this repo:

- `CLAUDE.md` — the rules. Read it fully. It overrides your defaults.
- `docs/01` through `docs/12` — the full specification.

**Read all of `CLAUDE.md` and all ten docs in `docs/` before writing a single line of code.**
They contain specific numbers — key widths in points, harmonic amplitude tables, bellows
decay rates, cent offsets. Use those numbers. Do not substitute your own.

Then work like this:

1. Write `PLAN.md` in the repo root. In it: the folder structure you'll create, the modules
   and their responsibilities, and the order you'll build them. Show me the plan and stop.
   Do not start coding until I say go.
2. Once I approve, build Phase 1 only (see `docs/08-build-plan.md`). Phase 1 is a playable
   instrument with real sound and working bellows. Nothing else.
3. When Phase 1 is done, run the Phase 1 checklist in `docs/09-acceptance-tests.md`
   yourself, honestly, and report which items pass and which do not.
4. Stop and wait for me. Do not roll into Phase 2 on your own.

Two things I care about more than anything else:

- **Latency.** The gap between my finger touching a key and hearing the reed must feel
  instant. Every architecture choice defers to this. `docs/05` explains how.
- **The sound.** It must sound like a wooden Indian harmonium with real reeds, not like a
  synth pad or an organ preset. `docs/03` describes the target in detail.

**How we work together.** I am building this entirely from a phone, so you cannot see the
running app and neither can any simulator you have. I am your eyes. Build it, push it, and
tell me exactly what to look at and what to listen for, phrased as questions I can answer
from the device. The checklists in `docs/09-acceptance-tests.md` are how we do that — walk
me through them rather than marking them passed yourself when they need a human ear.

Set up **GitHub Pages deployment** as part of Phase 0, so every push gives me a URL I can
open on the iPad and iPhone. Vite needs a relative base path for this to work on a Pages
subpath — the manifest in `docs/12` already uses relative `start_url` and `scope`, so keep
it that way. Commit straight to `main`; this is a solo project and pull requests just add
taps on a phone.

Where the spec is silent, use your judgement and write the decision into `DECISIONS.md`
with a one-line reason. Where the spec is wrong or impossible, say so before building around
it — do not silently work around a requirement.

Start by reading. Then give me `PLAN.md`.
