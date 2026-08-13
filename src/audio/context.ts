/**
 * AudioContext creation, unlock and lifecycle.
 *
 * iOS will not start a context outside a user gesture, and it suspends the
 * context whenever the app is backgrounded, a call arrives, or the phone is
 * rotated. Every one of those can leave a note droning, so this module owns
 * one signal — `interrupted` — that everything holding a voice listens to.
 */

import { CONTEXT_OPTIONS } from '../config/audio.ts';
import { Signal } from '../state/store.ts';

/** Fires whenever the audio graph may have been frozen mid-note. */
export const interrupted = new Signal<void>();

let ctx: AudioContext | null = null;

/** The live context, or null before the first user gesture. */
export function audioContext(): AudioContext | null {
  return ctx;
}

/**
 * Create and unlock the context. Must be called synchronously from inside a
 * user gesture handler — awaiting anything first loses the gesture on iOS.
 */
export function createContext(): AudioContext {
  if (ctx) return ctx;

  ctx = new AudioContext(CONTEXT_OPTIONS);

  // The one-sample silent buffer is what actually convinces iOS the context is
  // in use; resume() alone is not always enough.
  const unlockBuffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = unlockBuffer;
  source.connect(ctx.destination);
  source.start(0);

  void ctx.resume();

  ctx.addEventListener('statechange', () => {
    if (ctx?.state === 'suspended') interrupted.emit();
  });

  return ctx;
}

/** True once the context is confirmed running — the overlay waits on this. */
export function isRunning(): boolean {
  return ctx?.state === 'running';
}

/**
 * Resume after an interruption and release everything that was sounding. iOS
 * may have frozen the graph mid-note, so voices are dropped rather than
 * trusted.
 */
export function resumeAfterInterruption(): void {
  if (!ctx) return;
  interrupted.emit();
  if (ctx.state !== 'running') void ctx.resume();
}

/** Wire the lifecycle listeners. Called once from the boot sequence. */
export function watchContextLifecycle(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      interrupted.emit();
    } else {
      resumeAfterInterruption();
    }
  });

  window.addEventListener('blur', () => interrupted.emit());
  window.addEventListener('pagehide', () => interrupted.emit());
}
