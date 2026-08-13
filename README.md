# Swaranjali — spec pack

A complete build specification for a digital harmonium, for iPad Air (10.9") and iPhone.

Name: **Swaranjali** — *swara* (note) and *anjali* (the cupped-palm offering gesture).
An offering of notes. The name is the brief: this is an instrument for devotional practice,
not a product. Let it inform the tone of every design and copy decision.

## What this is

This folder is not the app. It is the set of instructions you hand to Claude Code so it can
build the app with very little back-and-forth from you.

## How to use it — from a phone, with no computer

The whole build runs in a Claude Code **cloud session**, which works from the Claude mobile
app or from claude.ai/code in Safari. No terminal, no laptop.

1. **Put the files on GitHub.** In Safari, sign in to github.com, create a new **public**
   repo, then Add file → Upload files and select all 15 `.md` files at once. Commit.
   They will all land in the root — that is fine, the first session sorts them.
2. **Start a cloud session** against that repo: Claude app → Code tab → New Session, or
   claude.ai/code in Safari.
3. **Paste the contents of `PROMPT.md`** as your first message.
4. **Test on your own devices.** The session pushes to GitHub, GitHub Pages serves it over
   HTTPS, and you open that URL on the iPhone or iPad and add it to the home screen.

Claude Code reads `CLAUDE.md` automatically on every session, so the ground rules stay in
force even after a context reset.

Cloud sessions require a Pro, Max, or Team plan.

**If you do have a computer:** clone the repo, run `claude` in the folder, paste `PROMPT.md`.
Everything else is identical.

## File map

| File | What it covers |
|---|---|
| `PROMPT.md` | The single kickoff message to paste. Not needed after session 1. |
| `CLAUDE.md` | Project constitution. Stack, rules, conventions, definition of done. |
| `docs/01-product-spec.md` | What the app is, who it's for, feature scope by phase. |
| `docs/02-ipad-layout.md` | Exact screen geometry in points. The hard constraint doc. |
| `docs/03-audio-engine.md` | Sound design, reed synthesis, bellows physics, signal chain. |
| `docs/04-indian-music.md` | Swaras, ragas, taals, notation, tuning systems. |
| `docs/05-touch-and-performance.md` | Latency, multi-touch, iPad Safari quirks. |
| `docs/06-visual-design.md` | Palette, type, materials, motion. |
| `docs/07-data-schemas.md` | TypeScript types and JSON seed data shapes. |
| `docs/08-build-plan.md` | Phased milestones with acceptance criteria. |
| `docs/09-acceptance-tests.md` | The checklist that decides whether a phase is done. |
| `docs/10-decisions-and-risks.md` | Known trade-offs, open questions, things that will not work. |
| `docs/11-responsive-layouts.md` | iPhone and iPad layouts, size classes, safe areas. |
| `docs/12-install-fullscreen-offline.md` | Home-screen install, fullscreen, offline, updates. |

## Read this before you start

`docs/10-decisions-and-risks.md` contains honest limits — things a web app on an iPad
genuinely cannot do, and where the sound will fall short of a real instrument. Read it
first so you know what you're getting.
