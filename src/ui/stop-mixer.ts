/**
 * The stop mixer: nine stops and a master, as faders.
 *
 * A fader responds to a drag anywhere on its column, not just on the cap, so a
 * thumb never has to be accurate. Dragging has no transition at all — it must
 * track the finger exactly.
 */

import { FADER_ORDER, PENDING_FADERS, type FaderId } from '../config/audio.ts';
import { MIXER } from '../config/layout.ts';

/** Doc 02's mixer strip, in order. */
const FADER_LABELS: Readonly<Record<FaderId, string>> = {
  bass: 'Bass',
  male: 'Male',
  female: 'Fem',
  coupler: 'Coup',
  droneSaMandra: 'Sa ·',
  droneSaMadhya: 'Sa ˙',
  dronePaMa: 'Pa',
  tanpura: 'Tanp',
  reverb: 'Rev',
  master: 'Master',
};

export interface StopMixerOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stage origin in client coordinates — the top safe-area inset. */
  originY: number;
  centres: number[];
  trackTop: number;
  trackH: number;
  labelBaseline: number;
  labelSize: number;
  value(id: FaderId): number;
  onChange(id: FaderId, value: number): void;
  /** Three fingers on the mixer silences everything — doc 05's panic gesture. */
  onPanic(): void;
}

export class StopMixer {
  readonly element: HTMLElement;
  readonly #caps = new Map<FaderId, HTMLElement>();
  readonly #options: StopMixerOptions;
  readonly #dragging = new Map<number, FaderId>();
  /** Timestamps of the last few touches, for the panic gesture. */
  readonly #recent: number[] = [];

  constructor(options: StopMixerOptions) {
    this.#options = options;

    this.element = document.createElement('div');
    this.element.className = 'mixer';
    this.element.style.left = `${options.x}px`;
    this.element.style.top = `${options.y}px`;
    this.element.style.width = `${options.w}px`;
    this.element.style.height = `${options.h}px`;

    FADER_ORDER.forEach((id, index) => {
      const centre = options.centres[index] ?? 0;
      this.element.appendChild(this.#buildFader(id, centre));
    });

    this.element.addEventListener('pointerdown', this.#down);
    this.element.addEventListener('pointermove', this.#move);
    this.element.addEventListener('pointerup', this.#up);
    this.element.addEventListener('pointercancel', this.#up);
    this.element.addEventListener('pointerleave', this.#up);
  }

  destroy(): void {
    this.element.remove();
    this.#caps.clear();
  }

  /** Reflect a value that changed elsewhere — settings load, or a reset. */
  refresh(id: FaderId): void {
    const cap = this.#caps.get(id);
    if (cap) cap.style.top = `${this.#capTop(this.#options.value(id))}px`;
  }

  #capTop(value: number): number {
    const travel = this.#options.trackH - MIXER.capH;
    return this.#options.trackTop + (1 - Math.min(1, Math.max(0, value))) * travel;
  }

  #valueAt(clientY: number): number {
    const travel = this.#options.trackH - MIXER.capH;
    const local = clientY - this.#options.originY - this.#options.y - this.#options.trackTop - MIXER.capH / 2;
    return Math.min(1, Math.max(0, 1 - local / travel));
  }

  #buildFader(id: FaderId, centre: number): HTMLElement {
    const column = document.createElement('div');
    column.className = 'fader';
    column.dataset['fader'] = id;
    column.style.left = `${centre - MIXER.faderPitch / 2}px`;
    column.style.width = `${MIXER.faderPitch}px`;
    if (PENDING_FADERS.includes(id)) column.classList.add('fader--pending');
    if (id === 'master') column.classList.add('fader--master');

    const track = document.createElement('div');
    track.className = 'fader__track';
    track.style.top = `${this.#options.trackTop}px`;
    track.style.height = `${this.#options.trackH}px`;
    track.style.width = `${MIXER.trackW}px`;

    const cap = document.createElement('div');
    cap.className = 'fader__cap';
    cap.style.width = `${MIXER.capW}px`;
    cap.style.height = `${MIXER.capH}px`;
    cap.style.top = `${this.#capTop(this.#options.value(id))}px`;

    const label = document.createElement('span');
    label.className = 'fader__label';
    label.style.top = `${this.#options.labelBaseline}px`;
    label.style.fontSize = `${this.#options.labelSize}px`;
    label.textContent = FADER_LABELS[id];

    column.append(track, cap, label);
    this.#caps.set(id, cap);
    return column;
  }

  #faderFrom(target: EventTarget | null): FaderId | null {
    const element = target instanceof HTMLElement ? target.closest('.fader') : null;
    const id = element instanceof HTMLElement ? element.dataset['fader'] : undefined;
    return (id as FaderId | undefined) ?? null;
  }

  #down = (event: PointerEvent): void => {
    this.#recent.push(event.timeStamp);
    if (this.#recent.length > 3) this.#recent.shift();
    // Three fingers landing on the mixer inside 250 ms is the hidden gesture
    // that silences everything, for when something has gone wrong mid-phrase.
    if (this.#recent.length === 3 && event.timeStamp - (this.#recent[0] ?? 0) < 250) {
      this.#recent.length = 0;
      this.#options.onPanic();
      return;
    }

    const id = this.#faderFrom(event.target);
    if (!id) return;
    // Some stops are visible but not yet live, so the instrument reads
    // correctly while it is being built.
    if (PENDING_FADERS.includes(id)) return;

    event.preventDefault();
    this.#dragging.set(event.pointerId, id);
    this.#apply(id, this.#valueAt(event.clientY));
  };

  #move = (event: PointerEvent): void => {
    const id = this.#dragging.get(event.pointerId);
    if (!id) return;
    this.#apply(id, this.#valueAt(event.clientY));
  };

  #up = (event: PointerEvent): void => {
    this.#dragging.delete(event.pointerId);
  };

  #apply(id: FaderId, value: number): void {
    const cap = this.#caps.get(id);
    if (cap) cap.style.top = `${this.#capTop(value)}px`;
    this.#options.onChange(id, value);
  }
}
