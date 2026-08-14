/**
 * The settings panel.
 *
 * Copy rule from doc 06: one sentence, explaining the consequence rather than
 * the mechanism. "Assist keeps the air full so you can use both hands to
 * sing. A real harmonium will not do this." — not "enable pressure floor
 * override".
 */

import { KEYBOARD_MODES, type KeyboardMode } from '../../config/layout.ts';
import { REFERENCE_A4_MAX, REFERENCE_A4_MIN, REFERENCE_A4_STEP } from '../../music/pitch.ts';
import type { SettingsStore } from '../../state/settings.ts';
import { formatStorageUsage } from '../../state/recordings-db.ts';
import { applyUpdate, updateReady } from '../../boot/register-sw.ts';
import { wakeLockRefused } from '../wake-lock.ts';

export interface SettingsPanelOptions {
  settings: SettingsStore;
  onClose(): void;
}

const KEYBOARD_MODE_COPY: Record<KeyboardMode, string> = {
  wide: 'Closest to a real harmonium key. Less of the keyboard fits.',
  standard: 'A comfortable one-hand melody range.',
  compact: 'More range, but the keys are cramped.',
};

export class SettingsPanel {
  readonly element: HTMLElement;
  readonly #options: SettingsPanelOptions;

  constructor(options: SettingsPanelOptions) {
    this.#options = options;

    this.element = document.createElement('div');
    this.element.className = 'panel';

    const sheet = document.createElement('div');
    sheet.className = 'panel__sheet';

    const heading = document.createElement('h2');
    heading.className = 'panel__heading';
    heading.textContent = 'Settings';

    const close = document.createElement('button');
    close.className = 'panel__close';
    close.type = 'button';
    close.textContent = 'Done';
    close.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      options.onClose();
    });

    const header = document.createElement('div');
    header.className = 'panel__header';
    header.append(heading, close);

    sheet.append(header, this.#body());
    this.element.appendChild(sheet);

    this.element.addEventListener('pointerdown', (event) => {
      if (event.target === this.element) options.onClose();
    });
  }

  destroy(): void {
    this.element.remove();
  }

  #body(): HTMLElement {
    const body = document.createElement('div');
    body.className = 'panel__body';
    const settings = this.#options.settings;

    body.append(
      this.#toggle(
        'Assist',
        'Assist keeps the air full so you can use both hands to sing. A real harmonium will not do this.',
        settings.current.assistMode,
        (assistMode) => settings.update({ assistMode }),
      ),
      this.#choice<KeyboardMode>(
        'Keyboard',
        KEYBOARD_MODE_COPY[settings.current.keyboardMode],
        (Object.keys(KEYBOARD_MODES) as KeyboardMode[]).map((mode) => ({
          value: mode,
          label: `${mode[0]?.toUpperCase()}${mode.slice(1)} · ${KEYBOARD_MODES[mode].mm} mm`,
        })),
        settings.current.keyboardMode,
        (keyboardMode) => settings.update({ keyboardMode }),
      ),
      this.#choice(
        'Output',
        'Tells the app what it is playing through, so it can shape the sound to suit. Use the speakers or wired headphones — Bluetooth adds enough delay to make playing unpleasant.',
        [
          { value: 'speaker' as const, label: 'Speaker' },
          { value: 'headphones' as const, label: 'Headphones' },
        ],
        settings.current.outputRoute,
        (outputRoute) => settings.update({ outputRoute }),
      ),
      this.#choice(
        'Key labels',
        'What the large label on each key says. The Western name stays underneath.',
        [
          { value: 'hindustani' as const, label: 'Sargam' },
          { value: 'carnatic' as const, label: 'Carnatic' },
          { value: 'devanagari' as const, label: 'Devanagari' },
          { value: 'western' as const, label: 'Western' },
        ],
        settings.current.labelStyle,
        (labelStyle) => settings.update({ labelStyle }),
      ),
      this.#referencePitch(),
      this.#toggle(
        'Keep the screen awake',
        wakeLockRefused()
          ? 'The screen can still sleep in Low Power Mode. Raising Auto-Lock in iOS Settings helps.'
          : 'Stops the screen sleeping while you practise.',
        settings.current.wakeLock,
        (wakeLock) => settings.update({ wakeLock }),
      ),
      this.#toggle(
        'Record my voice too',
        'Mixes the microphone into recordings so you can hear yourself singing over the harmonium. The microphone is only switched on when this is.',
        settings.current.micInRecordings,
        (micInRecordings) => settings.update({ micInRecordings }),
      ),
      this.#help(),
      this.#storage(),
      this.#version(),
    );

    return body;
  }

  #row(title: string, note: string): { row: HTMLElement; control: HTMLElement } {
    const row = document.createElement('div');
    row.className = 'setting';

    const text = document.createElement('div');
    text.className = 'setting__text';
    const label = document.createElement('div');
    label.className = 'setting__title';
    label.textContent = title;
    const description = document.createElement('div');
    description.className = 'setting__note';
    description.textContent = note;
    text.append(label, description);

    const control = document.createElement('div');
    control.className = 'setting__control';

    row.append(text, control);
    return { row, control };
  }

  #toggle(title: string, note: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
    const { row, control } = this.#row(title, note);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.classList.toggle('chip--on', value);
    button.textContent = value ? 'On' : 'Off';
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const next = !button.classList.contains('chip--on');
      button.classList.toggle('chip--on', next);
      button.textContent = next ? 'On' : 'Off';
      onChange(next);
    });
    control.appendChild(button);
    return row;
  }

  #choice<T extends string>(
    title: string,
    note: string,
    options: { value: T; label: string }[],
    current: T,
    onChange: (value: T) => void,
  ): HTMLElement {
    const { row, control } = this.#row(title, note);
    const group = document.createElement('div');
    group.className = 'chips';
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.classList.toggle('chip--on', option.value === current);
      button.textContent = option.label;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        for (const sibling of group.children) sibling.classList.remove('chip--on');
        button.classList.add('chip--on');
        onChange(option.value);
      });
      group.appendChild(button);
    }
    control.appendChild(group);
    return row;
  }

  #referencePitch(): HTMLElement {
    const settings = this.#options.settings;
    const { row, control } = this.#row(
      'Reference pitch',
      'Move this to tune the whole instrument to a recording or to another player.',
    );

    const reading = document.createElement('span');
    reading.className = 'setting__reading';
    const render = (): void => {
      reading.textContent = `${settings.current.referenceA4.toFixed(1)} Hz`;
    };

    const step = (direction: number) => (event: PointerEvent): void => {
      event.preventDefault();
      const next = Math.min(
        REFERENCE_A4_MAX,
        Math.max(REFERENCE_A4_MIN, settings.current.referenceA4 + direction * REFERENCE_A4_STEP),
      );
      settings.update({ referenceA4: next });
      render();
    };

    const down = document.createElement('button');
    down.type = 'button';
    down.className = 'chip';
    down.textContent = '−';
    down.addEventListener('pointerdown', step(-1));

    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'chip';
    up.textContent = '+';
    up.addEventListener('pointerdown', step(1));

    render();
    control.append(down, reading, up);
    return row;
  }

  #help(): HTMLElement {
    const { row } = this.#row(
      'While you practise',
      'If there is no sound, check the silent switch on the side of the phone. To stop iOS interrupting you, turn on Guided Access in Settings → Accessibility → Guided Access, then triple-click the top button once the app is open.',
    );
    return row;
  }

  #storage(): HTMLElement {
    const { row, control } = this.#row('Recordings', 'Space used on this device by saved recordings.');
    const reading = document.createElement('span');
    reading.className = 'setting__reading';
    reading.textContent = '—';
    void formatStorageUsage().then((text) => {
      reading.textContent = text;
    });
    control.appendChild(reading);
    return row;
  }

  #version(): HTMLElement {
    const { row, control } = this.#row('Version', __BUILD_ID__);
    const reading = document.createElement('span');
    reading.className = 'setting__reading';

    const render = (ready: boolean): void => {
      reading.textContent = ready ? '' : 'Up to date';
      if (!ready) return;
      const restart = document.createElement('button');
      restart.type = 'button';
      restart.className = 'chip chip--on';
      restart.textContent = 'A new version is ready — restart';
      restart.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        applyUpdate();
      });
      reading.replaceChildren(restart);
    };

    render(updateReady.current);
    updateReady.on(render);
    control.appendChild(reading);
    return row;
  }
}
