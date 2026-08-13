/**
 * Boot sequence: suppress everything iOS does that would interrupt playing,
 * start watching the viewport, then build the instrument behind the "Tap to
 * begin" overlay and mount the layout for the current size class.
 */

import './styles/tokens.css';
import './styles/base.css';
import './styles/boot.css';
import './styles/keyboard.css';
import './styles/mixer.css';
import './styles/pump.css';
import './styles/compact.css';
import './styles/panels.css';

import { App } from './app.ts';
import { WAVETABLE_PHASE_SEED } from './config/audio.ts';
import { benchmark } from './boot/benchmark.ts';
import { mountDebugBanks } from './boot/debug-banks.ts';
import { registerServiceWorker } from './boot/register-sw.ts';
import { showTapToBegin } from './boot/tap-to-begin.ts';
import { watchContextLifecycle } from './audio/context.ts';
import { seededRandom } from './audio/random.ts';
import { mountCompactLandscape } from './ui/layouts/compact-landscape.ts';
import { mountCompactPortrait } from './ui/layouts/compact-portrait.ts';
import { mountRegular } from './ui/layouts/regular.ts';
import { mountRotateMessage } from './ui/layouts/rotate-message.ts';
import type { LayoutMount, Teardown } from './ui/layouts/layout.ts';
import { isTabletPortrait, viewport, watchViewport, type Viewport } from './ui/size-class.ts';

/** Two-finger pinch on an instrument is a disaster. Doc 05. */
function suppressGestures(): void {
  const block = (event: Event): void => event.preventDefault();
  document.addEventListener('gesturestart', block);
  document.addEventListener('gesturechange', block);
  document.addEventListener('gestureend', block);
  document.addEventListener('dblclick', block);
  document.addEventListener('contextmenu', block);
}

/** `?debug=banks` swaps the instrument for the bank audition page. */
const debugBanks = new URLSearchParams(location.search).get('debug') === 'banks';

function layoutFor(v: Viewport): LayoutMount {
  if (debugBanks) return mountDebugBanks;
  if (isTabletPortrait(v)) return mountRotateMessage;
  switch (v.sizeClass) {
    case 'regular':
      return mountRegular;
    case 'compact-landscape':
      return mountCompactLandscape;
    case 'compact-portrait':
      return mountCompactPortrait;
  }
}

function boot(): void {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app is missing from index.html');

  suppressGestures();
  watchContextLifecycle();
  watchViewport();
  registerServiceWorker();

  const stage = document.createElement('div');
  stage.className = 'stage';
  const inner = document.createElement('div');
  inner.className = 'stage__inner';
  stage.appendChild(inner);
  root.appendChild(stage);

  void showTapToBegin(root, (ctx) => {
    // Everything expensive happens here, behind the overlay: the tier
    // benchmark, the wavetables, the reverb impulse and the voice pool. None
    // of it may happen on the first key press.
    const { tier } = benchmark(ctx);
    const app = new App(ctx, tier, seededRandom(WAVETABLE_PHASE_SEED));
    app.setPanelRoot(inner);
    app.start();

    let teardown: Teardown | null = null;

    // Every viewport change re-mounts from scratch, even when the size class
    // is unchanged, because the geometry depends on the exact stage size. This
    // is also what rebuilds the cached hit regions — stale key rectangles
    // after a rotate is the likeliest bug in this project.
    viewport.on((v) => {
      app.closeSettings();
      app.router.releaseAll();
      app.instrument.silenceAll();
      teardown?.();
      teardown = layoutFor(v)(inner, v, app);
    }, true);
  });
}

boot();
