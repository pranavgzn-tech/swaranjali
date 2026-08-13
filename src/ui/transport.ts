/**
 * Sa selection and octave shift — the controls under the pump on the iPad, and
 * the top bar on the phone.
 *
 * Four targets, as doc 02 draws them: octave down, Sa, octave up, menu. Sa
 * opens a picker rather than stepping, because stepping from C to B is eleven
 * taps and choosing Sa is something a singer does once at the start.
 *
 * Named the way a musician would: "Sa", not "root note". Changing it relabels
 * every key immediately, because the sargam is relative to it.
 */

import { TOUCH } from '../config/layout.ts';
import { pitchClassName } from '../music/pitch.ts';

export interface TransportOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  sa: number;
  octaveShift: number;
  onSaChange(sa: number): void;
  onOctaveChange(shift: number): void;
  onMenu(): void;
}

/** Octave shift is clamped to ±2 (doc 07). */
const OCTAVE_MIN = -2;
const OCTAVE_MAX = 2;

export class Transport {
  readonly element: HTMLElement;
  readonly #saButton: HTMLElement;
  readonly #octaveReading: HTMLElement;
  readonly #picker: HTMLElement;
  #sa: number;
  #octaveShift: number;
  readonly #options: TransportOptions;

  constructor(options: TransportOptions) {
    this.#options = options;
    this.#sa = options.sa;
    this.#octaveShift = options.octaveShift;

    this.element = document.createElement('div');
    this.element.className = 'transport';
    this.element.style.left = `${options.x}px`;
    this.element.style.top = `${options.y}px`;
    this.element.style.width = `${options.w}px`;
    this.element.style.height = `${options.h}px`;

    const octaveDown = this.#button('−', 'Octave down', () => this.#shiftOctave(-1));
    const octaveUp = this.#button('+', 'Octave up', () => this.#shiftOctave(1));
    this.#octaveReading = document.createElement('span');
    this.#octaveReading.className = 'transport__reading';

    this.#saButton = this.#button('', 'Choose Sa', () => this.#togglePicker());
    this.#saButton.classList.add('transport__sa');

    const menu = this.#button('☰', 'Settings', () => options.onMenu());

    const octaveGroup = document.createElement('div');
    octaveGroup.className = 'transport__group';
    octaveGroup.append(octaveDown, this.#octaveReading, octaveUp);

    this.#picker = this.#buildPicker();

    this.element.append(octaveGroup, this.#saButton, menu, this.#picker);
    this.#render();
  }

  destroy(): void {
    this.element.remove();
  }

  #button(glyph: string, label: string, onTap: () => void): HTMLElement {
    const button = document.createElement('button');
    button.className = 'transport__button';
    button.type = 'button';
    button.textContent = glyph;
    button.setAttribute('aria-label', label);
    button.style.minWidth = `${TOUCH.minButton}px`;
    button.style.minHeight = `${TOUCH.minButton}px`;
    // Pointer, not click: click waits for the browser to rule out a gesture.
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onTap();
    });
    return button;
  }

  #buildPicker(): HTMLElement {
    const picker = document.createElement('div');
    picker.className = 'picker';
    for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'picker__chip';
      chip.textContent = pitchClassName(pitchClass);
      chip.dataset['pitchClass'] = String(pitchClass);
      chip.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.#sa = pitchClass;
        this.#render();
        this.#togglePicker();
        this.#options.onSaChange(pitchClass);
      });
      picker.appendChild(chip);
    }
    return picker;
  }

  #togglePicker(): void {
    this.#picker.classList.toggle('picker--open');
  }

  #shiftOctave(direction: number): void {
    const next = Math.min(OCTAVE_MAX, Math.max(OCTAVE_MIN, this.#octaveShift + direction));
    if (next === this.#octaveShift) return;
    this.#octaveShift = next;
    this.#render();
    this.#options.onOctaveChange(next);
  }

  #render(): void {
    this.#saButton.textContent = `Sa ${pitchClassName(this.#sa)}`;
    this.#octaveReading.textContent =
      this.#octaveShift === 0 ? 'oct' : `oct ${this.#octaveShift > 0 ? '+' : ''}${this.#octaveShift}`;
    for (const chip of this.#picker.children) {
      const value = chip instanceof HTMLElement ? Number(chip.dataset['pitchClass']) : -1;
      chip.classList.toggle('picker__chip--on', value === this.#sa);
    }
  }
}
