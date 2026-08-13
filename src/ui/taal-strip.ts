/**
 * The taal strip: pick a cycle, start it, set the tempo, and see where you are.
 *
 * It sits in the band below the fader labels rather than in a panel, because
 * you need to see the beat *while* you play — and doc 01 is firm that nothing
 * in the interface blocks the keyboard.
 *
 * The dots are the matras. Sam, the first beat of the cycle and the one
 * everything resolves to, is marked ×. Khali, where the drum opens out and the
 * hand waves rather than claps, is marked 0. Those two marks are how you know
 * where you are in a cycle without counting.
 */

import { BPM_MAX, BPM_MIN, playableTaals, vibhagOf, type Taal } from '../music/taal.ts';
import { TOUCH } from '../config/layout.ts';
import type { MatraEvent } from '../audio/taal-engine.ts';

export interface TaalStripOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  taal: Taal;
  bpm: number;
  playing: boolean;
  onTaal(taal: Taal): void;
  onPlay(): void;
  onStop(): void;
  onBpm(bpm: number): void;
  onTap(): void;
}

const BPM_STEP = 4;

export class TaalStrip {
  readonly element: HTMLElement;
  readonly #dots: HTMLElement;
  readonly #name: HTMLElement;
  readonly #tempo: HTMLElement;
  readonly #play: HTMLElement;
  readonly #picker: HTMLElement;
  readonly #options: TaalStripOptions;

  #taal: Taal;
  #bpm: number;
  #playing: boolean;
  #lit: HTMLElement | null = null;

  constructor(options: TaalStripOptions) {
    this.#options = options;
    this.#taal = options.taal;
    this.#bpm = options.bpm;
    this.#playing = options.playing;

    this.element = document.createElement('div');
    this.element.className = 'taal';
    this.element.style.left = `${options.x}px`;
    this.element.style.top = `${options.y}px`;
    this.element.style.width = `${options.w}px`;
    this.element.style.height = `${options.h}px`;

    this.#name = this.#button(this.#taal.name, 'Choose taal', () => this.#togglePicker());
    this.#name.classList.add('taal__name');

    this.#play = this.#button(this.#playing ? '■' : '▶', 'Play or stop the taal', () => this.#toggle());
    this.#play.classList.add('taal__play');

    const slower = this.#button('−', 'Slower', () => this.#nudge(-BPM_STEP));
    const faster = this.#button('+', 'Faster', () => this.#nudge(+BPM_STEP));
    this.#tempo = document.createElement('span');
    this.#tempo.className = 'taal__tempo';

    const tap = this.#button('Tap', 'Tap the tempo', () => {
      options.onTap();
    });

    this.#dots = document.createElement('div');
    this.#dots.className = 'taal__dots';

    this.#picker = this.#buildPicker();

    this.element.append(this.#name, this.#play, slower, this.#tempo, faster, tap, this.#dots, this.#picker);
    this.#renderTempo();
    this.#renderDots();
  }

  destroy(): void {
    this.element.remove();
  }

  /** Reflect the engine's tempo, which tap tempo changes behind our back. */
  setBpm(bpm: number): void {
    this.#bpm = bpm;
    this.#renderTempo();
  }

  setPlaying(playing: boolean): void {
    this.#playing = playing;
    this.#play.textContent = playing ? '■' : '▶';
    if (!playing) {
      this.#lit?.classList.remove('taal__dot--on');
      this.#lit = null;
    }
  }

  /**
   * Light the beat at the moment it sounds, not when it was scheduled — the
   * counter has to agree with the ear, so the light waits for the audio clock
   * to catch up with the time the beat was booked for.
   */
  showMatra(event: MatraEvent, delaySeconds: number): void {
    const light = (): void => {
      this.#lit?.classList.remove('taal__dot--on');
      const dot = this.#dots.children[event.matra - 1];
      if (dot instanceof HTMLElement) {
        dot.classList.add('taal__dot--on');
        this.#lit = dot;
      }
    };
    if (delaySeconds <= 0) light();
    else setTimeout(light, delaySeconds * 1000);
  }

  #button(glyph: string, label: string, onTap: () => void): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'taal__button';
    button.textContent = glyph;
    button.setAttribute('aria-label', label);
    button.style.minHeight = `${Math.min(TOUCH.minButton, this.#options.h)}px`;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onTap();
    });
    return button;
  }

  #buildPicker(): HTMLElement {
    const picker = document.createElement('div');
    picker.className = 'picker picker--taal';
    for (const taal of playableTaals()) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'picker__chip';
      chip.textContent = `${taal.name} · ${taal.matras}`;
      chip.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.#taal = taal;
        this.#bpm = taal.defaultBpm;
        this.#name.textContent = taal.name;
        this.#renderTempo();
        this.#renderDots();
        this.#togglePicker();
        this.#options.onTaal(taal);
      });
      picker.appendChild(chip);
    }
    return picker;
  }

  #togglePicker(): void {
    this.#picker.classList.toggle('picker--open');
  }

  #toggle(): void {
    this.#playing = !this.#playing;
    this.#play.textContent = this.#playing ? '■' : '▶';
    if (this.#playing) this.#options.onPlay();
    else this.#options.onStop();
  }

  #nudge(by: number): void {
    const next = Math.min(BPM_MAX, Math.max(BPM_MIN, this.#bpm + by));
    if (next === this.#bpm) return;
    this.#bpm = next;
    this.#renderTempo();
    this.#options.onBpm(next);
  }

  #renderTempo(): void {
    this.#tempo.textContent = `${this.#bpm}`;
  }

  #renderDots(): void {
    this.#dots.replaceChildren();
    this.#lit = null;

    for (let matra = 1; matra <= this.#taal.matras; matra++) {
      const dot = document.createElement('span');
      dot.className = 'taal__dot';
      // A gap between vibhag, so the groups read at a glance.
      if (matra > 1 && vibhagOf(this.#taal, matra) !== vibhagOf(this.#taal, matra - 1)) {
        dot.classList.add('taal__dot--vibhag');
      }
      if (matra === this.#taal.sam) dot.textContent = '×';
      else if (this.#taal.khali.includes(matra)) dot.textContent = '0';
      else if (this.#taal.tali.includes(matra)) dot.textContent = String(this.#taal.tali.indexOf(matra) + 1);
      this.#dots.appendChild(dot);
    }
  }
}
