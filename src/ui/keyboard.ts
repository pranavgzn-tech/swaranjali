/**
 * The keyboard: absolutely positioned key elements with dual labels.
 *
 * Press feedback is a class toggle on a cached element reference and nothing
 * else. There is no re-render, because a re-render inside a touch handler
 * costs milliseconds that become audible lag.
 */

import type { KeyId } from '../audio/voice-pool.ts';
import type { KeyboardGeometry } from '../input/hit-regions.ts';
import { westernLabel } from '../music/pitch.ts';
import { degreeOf, isKomal, isTivra, saptakOf, swaraLabel, type LabelStyle } from '../music/swara.ts';
import type { KeyLayout } from './keyboard-model.ts';

export interface KeyboardOptions {
  layout: KeyLayout;
  geometry: KeyboardGeometry;
  sa: number;
  labelStyle: LabelStyle;
  showWesternSecondary: boolean;
  /** Bottom on the iPad, top on the phone — doc 11 means this difference. */
  labelPosition: 'top' | 'bottom';
  /** Distance of the sargam baseline from that edge, in points. */
  labelInset: number;
  westernInset: number;
  sargamSize: number;
  westernSize: number;
}

export class Keyboard {
  readonly element: HTMLElement;
  readonly #elements = new Map<KeyId, HTMLElement>();

  constructor(options: KeyboardOptions) {
    const { geometry, layout } = options;

    this.element = document.createElement('div');
    this.element.className = 'keys';
    this.element.style.left = `${geometry.x}px`;
    this.element.style.top = `${geometry.y}px`;
    this.element.style.width = `${geometry.w}px`;
    this.element.style.height = `${geometry.h}px`;

    for (const key of layout.white) {
      const el = this.#buildKey(key.id, options, false);
      el.style.left = `${key.index * geometry.whiteW}px`;
      el.style.width = `${geometry.whiteW}px`;
      el.style.height = `${geometry.h}px`;
      this.element.appendChild(el);
      this.#elements.set(key.id, el);
    }

    for (const key of layout.black) {
      const el = this.#buildKey(key.id, options, true);
      el.style.left = `${(key.afterWhiteIndex + 1) * geometry.whiteW - geometry.blackW / 2 + key.offset}px`;
      el.style.width = `${geometry.blackW}px`;
      el.style.height = `${geometry.blackH}px`;
      this.element.appendChild(el);
      this.#elements.set(key.id, el);
    }
  }

  /** The only thing a pointer event does to the DOM. */
  setPressed(key: KeyId, pressed: boolean): void {
    this.#elements.get(key)?.classList.toggle('key--down', pressed);
  }

  destroy(): void {
    this.element.remove();
    this.#elements.clear();
  }

  #buildKey(id: KeyId, options: KeyboardOptions, black: boolean): HTMLElement {
    const el = document.createElement('div');
    el.className = `key ${black ? 'key--black' : 'key--white'}`;

    const labels = document.createElement('div');
    labels.className = `key__labels key__labels--${options.labelPosition}`;
    labels.style[options.labelPosition] = `${options.labelInset}px`;

    const degree = degreeOf(id, options.sa);
    const saptak = saptakOf(id, options.sa);

    const primary = document.createElement('span');
    primary.className = `key__sargam key__sargam--${saptak}`;
    primary.style.fontSize = `${options.sargamSize}px`;
    if (options.labelStyle === 'western') {
      primary.textContent = westernLabel(id);
    } else {
      primary.textContent = swaraLabel(degree, options.labelStyle);
      // Bhatkhande's marks: komal underlined, tivra Ma with a line above.
      if (isKomal(degree)) primary.classList.add('key__sargam--komal');
      if (isTivra(degree)) primary.classList.add('key__sargam--tivra');
    }
    labels.appendChild(primary);

    if (options.showWesternSecondary && options.labelStyle !== 'western') {
      const secondary = document.createElement('span');
      secondary.className = 'key__western';
      secondary.style.fontSize = `${options.westernSize}px`;
      secondary.textContent = westernLabel(id);
      labels.appendChild(secondary);
    }

    el.appendChild(labels);
    return el;
  }
}
