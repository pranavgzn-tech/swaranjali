/**
 * The contract every layout implements. `main.ts` mounts exactly one at a
 * time and calls the returned teardown before mounting another, so no layout
 * ever leaves a listener or a DOM node behind on rotation.
 */

import type { Viewport } from '../size-class.ts';

export type Teardown = () => void;

export type LayoutMount = (root: HTMLElement, viewport: Viewport) => Teardown;
