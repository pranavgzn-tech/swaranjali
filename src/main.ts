/**
 * Boot sequence: suppress everything iOS does that would interrupt playing,
 * start watching the viewport, unlock audio behind the "Tap to begin" overlay,
 * then mount the layout for the current size class and re-mount it whenever
 * the viewport changes.
 */

import './styles/tokens.css';
import './styles/base.css';
import './styles/boot.css';
import './styles/regions.css';

import { registerServiceWorker } from './boot/register-sw.ts';
import { showTapToBegin } from './boot/tap-to-begin.ts';
import { watchContextLifecycle } from './audio/context.ts';
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

function layoutFor(v: Viewport): LayoutMount {
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
  const app = document.getElementById('app');
  if (!app) throw new Error('#app is missing from index.html');

  suppressGestures();
  watchContextLifecycle();
  watchViewport();
  registerServiceWorker();

  const stage = document.createElement('div');
  stage.className = 'stage';
  const inner = document.createElement('div');
  inner.className = 'stage__inner';
  stage.appendChild(inner);
  app.appendChild(stage);

  let teardown: Teardown | null = null;

  // Every viewport change re-mounts from scratch, even when the size class is
  // unchanged, because the geometry depends on the exact stage size. Phase 1
  // hangs the hit-region rebuild off this same signal — stale key rectangles
  // after a rotate is the likeliest bug in this project.
  viewport.on((v) => {
    teardown?.();
    teardown = layoutFor(v)(inner, v);
  }, true);

  void showTapToBegin(app);
}

boot();
