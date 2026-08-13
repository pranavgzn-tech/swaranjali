/**
 * Settings: the shape from doc 07, persisted to localStorage.
 *
 * These are device-independent on purpose. Sa, tuning, fader levels and
 * reference pitch survive rotation, a switch between size classes, and moving
 * between the phone and the iPad.
 */

import { FADER_DEFAULTS, type FaderId } from '../config/audio.ts';
import { COMPACT_AUDIO, type OutputRoute } from '../config/compact-audio.ts';
import type { KeyboardMode } from '../config/layout.ts';
import { REFERENCE_A4_DEFAULT } from '../music/pitch.ts';
import type { LabelStyle } from '../music/swara.ts';
import { Signal } from './store.ts';

export interface Settings {
  version: 1;
  /** Which pitch class is Sa, 0 = C. */
  sa: number;
  referenceA4: number;
  saMode: 'absolute' | 'fixed';
  tuning: '12tet' | 'shruti';
  keyboardMode: KeyboardMode;
  /** −2 … +2 */
  octaveShift: number;
  labelStyle: LabelStyle;
  showWesternSecondary: boolean;
  faders: Record<FaderId, number>;
  assistMode: boolean;
  droneNote: 'pa' | 'ma';
  handedness: 'right' | 'left';
  wakeLock: boolean;
  micInRecordings: boolean;
  /**
   * Speaker or headphones. Doc 07's Settings predates the speaker profile in
   * doc 11, which needs somewhere to live and must persist. See DECISIONS.md.
   */
  outputRoute: OutputRoute;
}

const STORAGE_KEY = 'swaranjali.settings';
const PERSIST_DEBOUNCE_MS = 400;

export function defaultSettings(lite: boolean): Settings {
  return {
    version: 1,
    sa: 0,
    referenceA4: REFERENCE_A4_DEFAULT,
    saMode: 'absolute',
    tuning: '12tet',
    keyboardMode: 'standard',
    octaveShift: 0,
    labelStyle: 'hindustani',
    showWesternSecondary: true,
    faders: {
      ...FADER_DEFAULTS,
      // The iPhone speaker has no low end, so the 16′ starts lower there.
      ...(lite ? { bass: COMPACT_AUDIO.defaultBassFader } : {}),
    },
    assistMode: false,
    droneNote: 'pa',
    handedness: 'right',
    wakeLock: true,
    micInRecordings: false,
    outputRoute: lite ? 'speaker' : 'headphones',
  };
}

/** Migrate a stored blob to the current version. Never drop what we can keep. */
function migrate(stored: unknown, fallback: Settings): Settings {
  if (typeof stored !== 'object' || stored === null) return fallback;
  const raw = stored as Partial<Settings>;
  // Version 1 is the first shape, so there is nothing to move yet. When a
  // version 2 arrives, translate here rather than discarding the user's setup.
  return {
    ...fallback,
    ...raw,
    version: 1,
    faders: { ...fallback.faders, ...(raw.faders ?? {}) },
  };
}

export class SettingsStore {
  readonly changed = new Signal<Settings>();
  #current: Settings;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(lite: boolean) {
    const fallback = defaultSettings(lite);
    let loaded = fallback;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) loaded = migrate(JSON.parse(raw), fallback);
    } catch {
      // A corrupt or unavailable store is not worth failing to boot over.
      loaded = fallback;
    }
    this.#current = loaded;
  }

  get current(): Settings {
    return this.#current;
  }

  /** Apply a partial change, notify listeners, and persist after a pause. */
  update(patch: Partial<Settings>): void {
    this.#current = { ...this.#current, ...patch };
    this.changed.emit(this.#current);
    this.#schedulePersist();
  }

  setFader(id: FaderId, value: number): void {
    this.update({ faders: { ...this.#current.faders, [id]: value } });
  }

  #schedulePersist(): void {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#current));
      } catch {
        // Private browsing or a full quota. The session still works.
      }
    }, PERSIST_DEBOUNCE_MS);
  }
}
