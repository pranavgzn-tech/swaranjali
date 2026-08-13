/**
 * Viewport -> size class, and the live safe-area insets.
 *
 * This is the only module allowed to decide which layout runs. It never reads
 * the user agent: iPad Split View and Slide Over produce phone-sized
 * viewports, and a layout keyed to the device name gets them wrong (doc 11).
 */

import { Value } from '../state/store.ts';

export type SizeClass = 'regular' | 'compact-landscape' | 'compact-portrait';

export interface Viewport {
  sizeClass: SizeClass;
  /** Usable stage, safe-area insets already removed. */
  w: number;
  h: number;
  insets: { top: number; right: number; bottom: number; left: number };
  /** Raw visual viewport, before insets. */
  rawW: number;
  rawH: number;
}

/** Doc 11's rule, verbatim. */
export function sizeClass(w: number, h: number): SizeClass {
  if (w >= 1000 && h >= 700) return 'regular'; // iPad full screen
  if (w > h) return 'compact-landscape'; // phone landscape, iPad split
  return 'compact-portrait'; // phone portrait
}

/**
 * A portrait viewport this wide is a tablet held upright, which doc 02 says
 * gets the rotate message rather than companion mode. Doc 11's `sizeClass`
 * cannot tell the two apart — both are 'compact-portrait' — and we may not ask
 * the user agent, so the split is by width: an iPad Air is 820 pt wide in
 * portrait, the largest iPhone is 430, and an iPad Split View column is
 * narrower still and genuinely wants companion mode. See DECISIONS.md.
 */
export const TABLET_PORTRAIT_MIN_W = 700;

export function isTabletPortrait(v: Viewport): boolean {
  return v.sizeClass === 'compact-portrait' && v.w >= TABLET_PORTRAIT_MIN_W;
}

/**
 * A probe element carrying env() padding. Reading its computed style is the
 * only way to get the insets as numbers. It is read on viewport change only —
 * never inside a pointer handler.
 */
let probe: HTMLElement | null = null;

function insetProbe(): HTMLElement {
  if (probe) return probe;
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top,0px)',
    'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)',
    'padding-left:env(safe-area-inset-left,0px)',
  ].join(';');
  document.body.appendChild(el);
  probe = el;
  return el;
}

function readInsets(): Viewport['insets'] {
  const style = getComputedStyle(insetProbe());
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

function measure(): Viewport {
  const vv = window.visualViewport;
  const rawW = Math.round(vv?.width ?? window.innerWidth);
  const rawH = Math.round(vv?.height ?? window.innerHeight);
  const insets = readInsets();
  const w = Math.round(rawW - insets.left - insets.right);
  const h = Math.round(rawH - insets.top - insets.bottom);
  return { sizeClass: sizeClass(w, h), w, h, insets, rawW, rawH };
}

/**
 * The current viewport. Subscribers are notified on resize, rotation and
 * Split View changes — every one of which must rebuild cached hit regions.
 *
 * The placeholder is never observed: `watchViewport()` takes the first real
 * measurement synchronously, and the boot sequence calls it before anything
 * subscribes. Measuring at module load instead would mean this file could not
 * be imported outside a browser, which the build-time layout check needs.
 */
const UNMEASURED: Viewport = {
  sizeClass: 'regular',
  w: 0,
  h: 0,
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  rawW: 0,
  rawH: 0,
};

export const viewport = new Value<Viewport>(UNMEASURED);

let scheduled = false;

function remeasure(): void {
  // Coalesce the burst of events a rotation fires, but stay in the same frame
  // so nothing paints against stale geometry.
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    const next = measure();
    const prev = viewport.current;
    if (
      next.sizeClass === prev.sizeClass &&
      next.w === prev.w &&
      next.h === prev.h &&
      next.insets.top === prev.insets.top &&
      next.insets.left === prev.insets.left &&
      next.insets.right === prev.insets.right &&
      next.insets.bottom === prev.insets.bottom
    ) {
      return;
    }
    viewport.set(next);
  });
}

/** Start watching the viewport. Called once, from the boot sequence. */
export function watchViewport(): void {
  window.addEventListener('resize', remeasure, { passive: true });
  window.addEventListener('orientationchange', remeasure, { passive: true });
  window.visualViewport?.addEventListener('resize', remeasure, { passive: true });
  window.visualViewport?.addEventListener('scroll', remeasure, { passive: true });
  viewport.set(measure());
}
