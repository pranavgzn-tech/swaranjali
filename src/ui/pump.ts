/**
 * The pump paddle and the air reservoir window.
 *
 * The reservoir is the one place in this interface to spend visual effort: a
 * brass-framed window showing the air as a body of warm light that breathes
 * with the pumping, dimming and cooling as it runs low. Everything else stays
 * quiet.
 *
 * The paddle is analogue. How far down the finger drags scales the pump rate,
 * so a long stroke fills faster than a tap.
 */

import { PUMP } from '../config/layout.ts';
import type { Bellows } from '../audio/bellows.ts';

export interface PumpOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stage origin in client coordinates — the top safe-area inset. */
  originY: number;
  bellows: Bellows;
  onRelease(): void;
}

export class Pump {
  readonly element: HTMLElement;
  readonly #paddle: HTMLElement;
  readonly #light: HTMLElement;
  readonly #options: PumpOptions;
  readonly #pointers = new Set<number>();
  #unsubscribe: (() => void) | null = null;

  constructor(options: PumpOptions) {
    this.#options = options;

    this.element = document.createElement('div');
    this.element.className = 'pump';
    this.element.style.left = `${options.x}px`;
    this.element.style.top = `${options.y}px`;
    this.element.style.width = `${options.w}px`;
    this.element.style.height = `${options.h}px`;

    this.#paddle = document.createElement('div');
    this.#paddle.className = 'pump__paddle';

    const grip = document.createElement('div');
    grip.className = 'pump__grip';
    this.#paddle.appendChild(grip);

    const window_ = document.createElement('div');
    window_.className = 'pump__reservoir';
    this.#light = document.createElement('div');
    this.#light.className = 'pump__light';
    window_.appendChild(this.#light);

    this.element.append(this.#paddle, window_);

    this.element.addEventListener('pointerdown', this.#down);
    this.element.addEventListener('pointermove', this.#move);
    this.element.addEventListener('pointerup', this.#up);
    this.element.addEventListener('pointercancel', this.#up);
    this.element.addEventListener('pointerleave', this.#up);

    this.#unsubscribe = options.bellows.onFrame.on(this.#render);
    this.#render(options.bellows.pressure);
  }

  destroy(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#options.bellows.stopPumping();
    this.element.remove();
  }

  /** Fraction of the paddle's height the finger has travelled, 0…1. */
  #travelAt(clientY: number): number {
    const local = clientY - this.#options.originY - this.#options.y;
    return Math.min(1, Math.max(0, local / this.#options.h));
  }

  #down = (event: PointerEvent): void => {
    event.preventDefault();
    this.#pointers.add(event.pointerId);
    const travel = this.#travelAt(event.clientY);
    this.#options.bellows.startPumping(travel);
    this.#paddle.classList.add('pump__paddle--down');
    this.#paddle.style.transform = `translateY(${(travel * PUMP.travel).toFixed(1)}px)`;
  };

  #move = (event: PointerEvent): void => {
    if (!this.#pointers.has(event.pointerId)) return;
    const travel = this.#travelAt(event.clientY);
    this.#options.bellows.setTravel(travel);
    this.#paddle.style.transform = `translateY(${(travel * PUMP.travel).toFixed(1)}px)`;
  };

  #up = (event: PointerEvent): void => {
    if (!this.#pointers.delete(event.pointerId)) return;
    if (this.#pointers.size > 0) return;
    this.#options.bellows.stopPumping();
    this.#options.onRelease();
    this.#paddle.classList.remove('pump__paddle--down');
    this.#paddle.style.transform = 'translateY(0)';
  };

  /**
   * Driven by the same frame loop as the physics, so the light and the sound
   * are never out of step. Transform and opacity only.
   */
  #render = (pressure: number): void => {
    this.#light.style.transform = `scaleX(${Math.max(0.001, pressure).toFixed(3)})`;
    // Warm and steady when full; dim and cool when the air runs low.
    this.#light.style.opacity = (0.28 + pressure * 0.72).toFixed(3);
  };
}
