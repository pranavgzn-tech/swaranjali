/**
 * iPad portrait. A line of text and a rotate glyph, full screen — no partial
 * layout and no scaled-down keyboard (doc 02).
 */

import type { LayoutMount } from './layout.ts';

export const mountRotateMessage: LayoutMount = (root) => {
  const el = document.createElement('div');
  el.className = 'rotate';
  el.innerHTML = `
    <div class="rotate__inner">
      <div class="rotate__glyph" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="14" y="6" width="20" height="36" rx="3" />
          <path d="M8 30a18 18 0 0 0 12 10" />
          <path d="M6 24v6h6" />
        </svg>
      </div>
      <p class="rotate__text">Turn the iPad sideways to play.</p>
    </div>`;
  root.appendChild(el);
  return () => el.remove();
};
