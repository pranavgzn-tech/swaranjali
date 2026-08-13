# 12 — Install, fullscreen, and offline

The app is installed to the home screen and run as a standalone app. From there it must
fill the screen and work with no network at all, with every feature intact.

## What "fullscreen" actually means on iOS — read this before designing around it

There is no honest way to get true fullscreen on iOS from the web. The Fullscreen API is
not available for general elements on iPhone Safari, and on iPad it is unreliable. **Adding
to the home screen is the mechanism**, and it gets you most of the way:

| | In Safari | Installed to home screen |
|---|---|---|
| URL bar and toolbars | Present, eats ~50 pt on iPhone landscape | **Gone** |
| Tab bar | Present | **Gone** |
| Status bar (clock, battery) | Present | iPhone landscape: hidden. iPad: slim bar remains. |
| Swipe-back gesture | Can navigate away mid-phrase | **Disabled** |
| Storage eviction | Can be cleared after periods of disuse | Retained |
| Launch | Through the browser | Own icon, own app-switcher card |

So: **iPhone in landscape gets genuinely full screen.** iPad keeps a thin status bar that
overlays the top edge. That is a platform limit, not something to work around.

Guided Access (already covered in `05-touch-and-performance.md`) is what removes the
remaining interruptions.

## Manifest

```json
{
  "name": "Swaranjali",
  "short_name": "Swaranjali",
  "start_url": "./?launch=standalone",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#2A1A12",
  "theme_color": "#2A1A12",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png",
      "purpose": "maskable" }
  ]
}
```

`orientation` is `any`, not `landscape` — the phone needs portrait for companion mode. The
app decides what to show per orientation, not the manifest.

`background_color` must match `--wood-deep`. It is what iOS shows during launch, and a
white flash before a dark instrument looks broken.

## Head tags — all of these are required

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1,
               user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Swaranjali">
<meta name="theme-color" content="#2A1A12">
<link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">
<link rel="manifest" href="manifest.json">
```

`black-translucent` plus `viewport-fit=cover` is what lets the instrument run edge to edge
underneath the status bar. Without both, you get a black band at the top.

Do not rely on the manifest alone on iOS. The `apple-` meta tags still do the real work.

## Launch screens

Without them iOS shows a white flash on every cold launch. Provide
`apple-touch-startup-image` links with media queries for the target devices:

| Device | Portrait px | Landscape px |
|---|---|---|
| iPad Air 10.9" | 1640 × 2360 | 2360 × 1640 |
| iPhone 15/16 / Pro | 1179 × 2556 | 2556 × 1179 |
| iPhone Plus / Pro Max | 1290 × 2796 | 2796 × 1290 |

Generate them at build time from a single source: `--wood-deep` background with the icon
centred. Do not hand-make six PNGs.

## Layout must derive from the real viewport, not the nominal one

This is the part that breaks if you skip it. In standalone with `black-translucent`, the
iPad reports a top safe-area inset for the status bar, and the nominal 820 pt of usable
height is no longer all yours.

**Do not hard-code the three band heights.** Derive them:

```ts
const safeTop    = readInset('top');      // iPad standalone: ~24pt. iPhone landscape: 0.
const safeBottom = readInset('bottom');   // home indicator: ~20-21pt
const stageH     = viewportH - safeTop - safeBottom;

// The keyboard is the thing that must stay generous. The top band absorbs the inset.
const keyboardH = REGULAR.keyboardH;              // 520 on iPad
const topBandH  = stageH - keyboardH;             // ~276 rather than 300 when installed
```

Then scale the mixer's internal geometry to `topBandH`:

```ts
export const MIXER_DERIVED = (topBandH: number) => ({
  trackTop: Math.round(topBandH * 0.173),
  trackH:   Math.round(topBandH * 0.560),
  labelBaseline: Math.round(topBandH * 0.813),
});
```

The constants in `02-ipad-layout.md` remain the reference values at `safeTop = 0`. Treat
them as ratios of a 300 pt band, not fixed pixel positions.

**The pump paddle and the fader caps must not shrink below their minimums** (300 × 230 and
62 × 34). If the derived band cannot hold them, reduce `keyboardH` instead, down to a floor
of 460 pt.

## Offline — the spec was already built for this

Nothing in this app needs the network at runtime, by design:

| Feature | Why it works offline |
|---|---|
| Reed sound | Synthesised from harmonic tables in code. No samples to download. |
| Reverb | Impulse generated in code at boot. No IR file. |
| Tabla | Synthesised. No samples. |
| Ragas, taals, alankars | Bundled JSON, imported at build time. |
| Fonts | Self-hosted WOFF2 in the bundle. **No Google Fonts CDN link.** |
| Icons | Inline SVG in the source. No icon font. |
| Recorder | `MediaRecorder` and the mic are local. |
| Settings | `localStorage`. |

If you ever find yourself writing `fetch()` to an external host, you have broken the
offline guarantee. There is no legitimate reason to.

## Service worker

**Precache everything, cache-first, no network fallback.** This is an instrument, not a
site — there is no such thing as fresh content.

```
1. Build writes a precache list of every file in dist/ with a content hash.
2. Service worker installs, opens cache `swaranjali-v{BUILD_HASH}`, adds all of them.
3. activate: delete every cache whose name is not the current one, then claim clients.
4. fetch: same-origin GET -> cache.match first. On miss, network, then cache the result.
   Cross-origin -> let it through untouched (there should be none).
5. Navigation requests -> always serve the cached index.html.
```

Generate the precache list with a build script. Never hand-maintain it — a missing file
means a broken app in aeroplane mode, discovered at the worst moment.

```js
// sw.js — shape only
const CACHE = `swaranjali-${BUILD_HASH}`;
const PRECACHE = [/* injected at build time */];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

Service workers need HTTPS. Any static host works — the app is a folder of files. `localhost`
works for development without HTTPS.

## Recordings need IndexedDB, not localStorage

Audio blobs will blow past the ~5 MB localStorage limit within a few takes, and localStorage
cannot hold binary data cleanly anyway.

- Store recordings in **IndexedDB**: `{ id, createdAt, durationMs, label, blob }`.
- Keep settings in `localStorage` — small, synchronous, simple.
- Call `navigator.storage.persist()` once after the first recording is saved, so iOS treats
  the data as durable.
- Show used space from `navigator.storage.estimate()` in settings, with a way to delete
  individual recordings. A practice log fills up faster than people expect.

## Updates — how new versions actually reach the device

Cache-first means the installed app will happily run an old build forever. So:

1. On launch, if online, the service worker checks for a new `sw.js` in the background.
2. If a new version installs and is waiting, show a **quiet, non-blocking** line in
   settings: a new version is ready, restart to use it.
3. **Never auto-reload.** Swapping the app out mid-phrase is unacceptable in an instrument.
4. The user taps restart when they choose, which calls `skipWaiting` and reloads.

Put the build version and date in settings. Five taps on it opens the diagnostics panel.

## Install prompt

iOS gives no `beforeinstallprompt`. Detect standalone with:

```ts
const installed = window.matchMedia('(display-mode: standalone)').matches
               || (navigator as any).standalone === true;
```

If not installed, show a one-time dismissible banner with the literal steps — Share button,
then Add to Home Screen — and say plainly why it matters: full screen, works offline,
no browser bars. Remember the dismissal. Never show it again once installed.

## Acceptance tests — add to Phase 0 and Phase 1

- [ ] Installed to the home screen on both devices, launching from the icon
- [ ] No white flash on cold launch — the launch screen matches `--wood-deep`
- [ ] iPhone landscape: no status bar, no browser chrome, instrument fills the screen
- [ ] iPad: the status bar overlays only non-interactive area, nothing is obscured
- [ ] Band heights derive correctly — the pump is still 300 × 230 and faders still grabbable
- [ ] **Aeroplane mode, force-quit, relaunch: every feature works** — keys, pump, stops,
      drone, taal, ragas, notation, recorder
- [ ] Zero network requests at runtime — confirm in the network inspector
- [ ] A recording survives a force-quit and relaunch
- [ ] Deploying a new build shows the update line in settings and does not auto-reload
- [ ] After updating, old caches are deleted — check storage usage does not keep growing
