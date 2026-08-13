/**
 * The live application: settings, the instrument, and the input path.
 *
 * Layouts come and go as the viewport changes; this does not. It owns the
 * things that must survive a rotation — the audio graph, the settings, and the
 * cached hit regions that every layout rebuilds.
 */

import { FADER_ORDER } from './config/audio.ts';
import type { AudioTier } from './config/compact-audio.ts';
import { Instrument } from './audio/instrument.ts';
import { interrupted } from './audio/context.ts';
import { HitRegions } from './input/hit-regions.ts';
import { PointerRouter } from './input/pointer-router.ts';
import { SettingsStore } from './state/settings.ts';
import type { Keyboard } from './ui/keyboard.ts';
import { SettingsPanel } from './ui/panels/settings.ts';
import { requestWakeLock, releaseWakeLock } from './ui/wake-lock.ts';

export class App {
  readonly settings: SettingsStore;
  readonly instrument: Instrument;
  readonly regions = new HitRegions();
  readonly router: PointerRouter;

  #keyboard: Keyboard | null = null;
  #panelRoot: HTMLElement | null = null;
  #panel: SettingsPanel | null = null;

  constructor(ctx: AudioContext, tier: AudioTier, random: () => number) {
    this.settings = new SettingsStore(tier === 'lite');

    this.instrument = new Instrument(
      ctx,
      tier,
      {
        assistMode: () => this.settings.current.assistMode,
        referenceA4: () => this.settings.current.referenceA4,
        sa: () => this.settings.current.sa,
        droneNote: () => this.settings.current.droneNote,
      },
      random,
    );

    this.router = new PointerRouter(this.regions, {
      noteOn: (key) => this.instrument.noteOn(key),
      noteOff: (key) => this.instrument.noteOff(key),
      setPressed: (key, pressed) => this.#keyboard?.setPressed(key, pressed),
    });

    this.applySettings();
    this.settings.changed.on(() => this.applySettings());

    // An interruption may have frozen the graph mid-note. Drop everything
    // rather than trusting what is still sounding.
    interrupted.on(() => {
      this.router.releaseAll();
      this.instrument.silenceAll();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.settings.current.wakeLock) {
        void requestWakeLock();
      } else {
        void releaseWakeLock();
      }
    });
  }

  /** The layout tells the app which keyboard is on screen, or none. */
  setKeyboard(keyboard: Keyboard | null): void {
    this.#keyboard = keyboard;
  }

  /** Where panels mount. Above the layout, so a re-mount does not disturb it. */
  setPanelRoot(root: HTMLElement | null): void {
    this.#panelRoot = root;
  }

  openSettings(): void {
    if (this.#panel || !this.#panelRoot) return;
    // Panels never render while a note is sounding, and opening one releases
    // whatever a finger was holding under it.
    this.router.releaseAll();
    this.#panel = new SettingsPanel({
      settings: this.settings,
      onClose: () => this.closeSettings(),
    });
    this.#panelRoot.appendChild(this.#panel.element);
  }

  closeSettings(): void {
    this.#panel?.destroy();
    this.#panel = null;
  }

  /** Silence everything at once. The hidden gesture, and interruptions. */
  panic(): void {
    this.router.releaseAll();
    this.instrument.silenceAll();
  }

  start(): void {
    this.instrument.start();
    if (this.settings.current.wakeLock) void requestWakeLock();
  }

  /** Push the stored settings into the audio graph. */
  applySettings(): void {
    const settings = this.settings.current;
    // Tuning first: a fader that starts a drone should start it at the right
    // pitch rather than sliding into it.
    this.instrument.retune();
    for (const id of FADER_ORDER) {
      this.instrument.setFader(id, settings.faders[id]);
    }
    this.instrument.setOutputRoute(settings.outputRoute);
  }
}
