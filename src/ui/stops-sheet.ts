/**
 * The stops sheet on compact viewports.
 *
 * Ten faders cannot be thumb-accurate at phone width, so the mixer lives in a
 * pull-down sheet instead. It covers the top two-thirds and leaves the pump
 * strip visible and live underneath — you can keep the air up while adjusting
 * the stops, which is exactly when you want to hear them.
 */

import { FADER_ORDER, PHASE_2_FADERS, type FaderId } from '../config/audio.ts';
import { COMPACT_TYPE } from '../config/compact.ts';
import { TOUCH } from '../config/layout.ts';

const LABELS: Readonly<Record<FaderId, string>> = {
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

export interface StopsSheetOptions {
  stageW: number;
  stageH: number;
  originY: number;
  coverage: number;
  value(id: FaderId): number;
  onChange(id: FaderId, value: number): void;
}

export class StopsSheet {
  readonly element: HTMLElement;
  readonly #options: StopsSheetOptions;
  readonly #rows = new Map<FaderId, HTMLElement>();
  readonly #dragging = new Map<number, FaderId>();
  readonly #height: number;
  #open = false;

  constructor(options: StopsSheetOptions) {
    this.#options = options;
    this.#height = Math.round(options.stageH * options.coverage);

    this.element = document.createElement('div');
    this.element.className = 'sheet';
    this.element.style.height = `${this.#height}px`;
    this.element.style.transform = `translateY(${-this.#height}px)`;

    const grid = document.createElement('div');
    grid.className = 'sheet__grid';

    for (const id of FADER_ORDER) {
      grid.appendChild(this.#buildRow(id));
    }

    this.element.appendChild(grid);
    this.element.addEventListener('pointerdown', this.#down);
    this.element.addEventListener('pointermove', this.#move);
    this.element.addEventListener('pointerup', this.#up);
    this.element.addEventListener('pointercancel', this.#up);
  }

  /**
   * Horizontal faders here rather than vertical: a thumb sweeping sideways
   * across a full-width row is far more accurate than a 34 pt cap on a phone.
   */
  #buildRow(id: FaderId): HTMLElement {
    const row = document.createElement('div');
    row.className = 'sheet__row';
    row.dataset['fader'] = id;
    row.style.minHeight = `${TOUCH.minButton}px`;
    if (PHASE_2_FADERS.includes(id)) row.classList.add('sheet__row--pending');

    const label = document.createElement('span');
    label.className = 'sheet__label';
    label.style.fontSize = `${COMPACT_TYPE.faderLabel}px`;
    label.textContent = LABELS[id];

    const track = document.createElement('div');
    track.className = 'sheet__track';
    const fill = document.createElement('div');
    fill.className = 'sheet__fill';
    fill.style.transform = `scaleX(${this.#options.value(id).toFixed(3)})`;
    track.appendChild(fill);

    row.append(label, track);
    this.#rows.set(id, fill);
    return row;
  }

  toggle(): void {
    this.#open = !this.#open;
    this.element.style.transform = this.#open ? 'translateY(0)' : `translateY(${-this.#height}px)`;
  }

  close(): void {
    if (!this.#open) return;
    this.toggle();
  }

  destroy(): void {
    this.element.remove();
    this.#rows.clear();
  }

  #faderFrom(target: EventTarget | null): FaderId | null {
    const element = target instanceof HTMLElement ? target.closest('.sheet__row') : null;
    const id = element instanceof HTMLElement ? element.dataset['fader'] : undefined;
    return (id as FaderId | undefined) ?? null;
  }

  #valueAt(row: HTMLElement, clientX: number): number {
    // The row spans the sheet's width minus the label column, and the sheet is
    // full-bleed, so the track's left edge is known without measuring.
    const trackLeft = row.offsetLeft + SHEET_LABEL_W;
    const trackWidth = this.#options.stageW - SHEET_LABEL_W - SHEET_PADDING * 2;
    return Math.min(1, Math.max(0, (clientX - trackLeft - SHEET_PADDING) / trackWidth));
  }

  #down = (event: PointerEvent): void => {
    const id = this.#faderFrom(event.target);
    if (!id || PHASE_2_FADERS.includes(id)) return;
    const row = event.target instanceof HTMLElement ? event.target.closest('.sheet__row') : null;
    if (!(row instanceof HTMLElement)) return;

    event.preventDefault();
    this.#dragging.set(event.pointerId, id);
    this.#apply(id, this.#valueAt(row, event.clientX));
  };

  #move = (event: PointerEvent): void => {
    const id = this.#dragging.get(event.pointerId);
    if (!id) return;
    const row = this.element.querySelector(`[data-fader="${id}"]`);
    if (!(row instanceof HTMLElement)) return;
    this.#apply(id, this.#valueAt(row, event.clientX));
  };

  #up = (event: PointerEvent): void => {
    this.#dragging.delete(event.pointerId);
  };

  #apply(id: FaderId, value: number): void {
    const fill = this.#rows.get(id);
    if (fill) fill.style.transform = `scaleX(${value.toFixed(3)})`;
    this.#options.onChange(id, value);
  }
}

/** Kept in step with the sheet CSS. */
const SHEET_LABEL_W = 62;
const SHEET_PADDING = 12;
