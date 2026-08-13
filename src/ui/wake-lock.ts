/**
 * Keeps the screen awake while practising.
 *
 * The request can be refused — Low Power Mode does it routinely — so every
 * path here degrades quietly. The screen sleeping mid-practice is maddening,
 * but a rejected promise is not a reason to interrupt anyone.
 */

let sentinel: WakeLockSentinel | null = null;
let refused = false;

/** True once a request has been refused, so settings can suggest auto-lock. */
export function wakeLockRefused(): boolean {
  return refused;
}

export async function requestWakeLock(): Promise<void> {
  if (sentinel || !('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    refused = true;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    // Already gone. Nothing to do.
  }
  sentinel = null;
}
