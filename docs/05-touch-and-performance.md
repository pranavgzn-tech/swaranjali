# 05 — Touch, latency, and iPad Safari reality

## The target

**Under 30 ms from finger contact to audible reed onset.** Anything above ~40 ms feels like
a delay and will make practice unpleasant. Everything in this doc exists to protect that
number.

## Pointer handling

Use Pointer Events. Never touch events, never mouse events.

Attach `pointerdown`, `pointermove`, `pointerup`, `pointercancel` to **one container**, not
to each key. Keep a `Map<number, KeyId>` of active pointers.

**Do not use `setPointerCapture` on the keyboard.** Capture breaks glissando, because the
element that received the down event keeps receiving all moves. Handle it by geometry
instead.

**Hit-testing by maths, not the DOM.** Cache every key's rectangle once at boot and on
resize. On a pointer event, compute the key from x and y directly. Test black keys first,
since they overlap the white keys visually.

```ts
function keyAt(x: number, y: number): KeyId | null {
  if (y < KEYBOARD.y) return null;
  const localY = y - KEYBOARD.y;
  if (localY <= KEYBOARD.blackH) {
    const black = blackRects.find(r => x >= r.x && x < r.x + r.w);
    if (black) return black.id;
  }
  const index = Math.floor(x / KEYBOARD.whiteW);
  return whiteIds[index] ?? null;
}
```

Never call `getBoundingClientRect()` or `document.elementFromPoint()` inside a pointer
handler. Both force layout and cost milliseconds.

**Glissando:** on `pointermove`, if `keyAt()` returns a different key than that pointer's
current key, note-off the old and note-on the new in the same tick. This is how meend-like
slides across the keyboard work.

**Multi-touch:** iPad reports up to 11 simultaneous touches. Handle all of them. A pointer
that leaves the keyboard region releases its note. `pointercancel` releases too — it fires
when the system interrupts, and a stuck droning note is the worst possible bug here.

**Panic release:** on `visibilitychange` to hidden, on `blur`, and on any pointer state
inconsistency, release every voice. Also give the user a hidden gesture (three-finger tap on
the mixer) that silences everything.

> iPhone-specific interruptions — calls, the ring/silent switch, rotation, Low Power Mode —
> are covered in `11-responsive-layouts.md`. They matter more on a phone and each one can
> leave a note droning.

## Stopping iOS from interfering

```html
<meta name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1,
               user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

```css
html, body, #app {
  touch-action: none;
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  position: fixed;
  inset: 0;
}
```

Also: `preventDefault()` on `gesturestart`, `gesturechange`, and on `dblclick`. Two-finger
pinch-zoom on an instrument is a disaster.

## Screen sleep

Request a Wake Lock when audio starts, release it when the app is backgrounded, re-request
on `visibilitychange`. Handle the promise rejecting — it can be refused in low power mode,
in which case show a small one-time note suggesting the user raise their auto-lock time.

## Audio context lifecycle

- Create the context on the **first user gesture**, not at page load. iOS will not start it
  otherwise.
- On creation: `ctx.resume()` then play a one-sample silent buffer.
- On `visibilitychange` back to visible, check `ctx.state` and resume if suspended, and
  release all voices, because iOS may have frozen mid-note.
- Show a "Tap to begin" overlay until the context is confirmed running.

## Main thread discipline

The instrument is only as fast as the slowest thing on the main thread.

- No framework re-render on touch. Update key visuals by toggling a class on a cached
  element reference — that is it.
- The bellows simulation runs in `requestAnimationFrame`. Keep it under 1 ms.
- Any UI animation uses `transform` and `opacity` only. Never animate width, height, or
  box-shadow.
- Panels (raga browser, notation) render lazily and never while a note is sounding.
- Do the wavetable, reverb impulse, and voice pool construction during the "Tap to begin"
  screen, not on first key press.

## What genuinely does not work on iOS Safari — plan around these

| Wanted | Reality |
|---|---|
| Web MIDI | Not supported. No external keyboard input. Ever. |
| `navigator.vibrate` | Not supported. No haptic feedback from the web. |
| Bluetooth headphones | AirPods add roughly 150 ms of latency. Unusable for playing. |
| Background audio | Suspended when the app is backgrounded. Expected, not a bug. |
| Guaranteed low buffer | Safari picks the buffer size. `latencyHint` is a hint, not a promise. |

**Put a line in settings** telling the user: use the iPad speakers or wired headphones, not
Bluetooth. This will otherwise waste hours of their time wondering why it feels sluggish.

## PWA and offline

> Full detail is in `12-install-fullscreen-offline.md`. Summary below.

- `manifest.json` with `display: standalone`, `orientation: landscape`, dark theme colour,
  and icons at 180, 192, 512.
- Service worker caches the full app shell and all JSON data on install. Cache-first for
  everything. The app must work in aeroplane mode.
- Version the cache and clear old ones on activate.
- No runtime network requests. If you find yourself writing `fetch()` to an external host,
  stop.

## Guided Access — put this in the settings help text

iOS edge swipes can drag the user out of the app mid-phrase. Tell them, in plain words, to
turn on Guided Access (Settings → Accessibility → Guided Access), then triple-click the top
button after opening the app. It locks the screen to the instrument and blocks
notifications. This single tip meaningfully improves daily practice.

## Measuring latency

Build a hidden diagnostics panel (five taps on the version number). Show:
- `ctx.baseLatency` and `ctx.outputLatency` in ms
- rolling average of `pointerdown` → `noteOn` scheduling time
- active voice count, dropped-frame count, current air pressure

If measured touch-to-schedule time exceeds 8 ms on average, something in the input path is
doing work it should not. Find it before adding features.
