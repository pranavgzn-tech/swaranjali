/**
 * The whole state layer: a typed pub/sub with no dependencies and no
 * scheduling. Handlers run synchronously on publish, because the audio path
 * cannot wait for a microtask.
 */

export type Unsubscribe = () => void;

export class Signal<T> {
  #handlers = new Set<(value: T) => void>();

  /** Subscribe to future values. Returns the unsubscribe function. */
  on(handler: (value: T) => void): Unsubscribe {
    this.#handlers.add(handler);
    return () => this.#handlers.delete(handler);
  }

  /** Publish to every subscriber, synchronously and in subscription order. */
  emit(value: T): void {
    for (const handler of this.#handlers) handler(value);
  }

  get size(): number {
    return this.#handlers.size;
  }
}

/** A Signal that also remembers its current value. */
export class Value<T> {
  #current: T;
  #signal = new Signal<T>();

  constructor(initial: T) {
    this.#current = initial;
  }

  get current(): T {
    return this.#current;
  }

  set(next: T): void {
    if (Object.is(next, this.#current)) return;
    this.#current = next;
    this.#signal.emit(next);
  }

  /** Subscribe. Pass `immediate` to also receive the current value now. */
  on(handler: (value: T) => void, immediate = false): Unsubscribe {
    if (immediate) handler(this.#current);
    return this.#signal.on(handler);
  }
}
