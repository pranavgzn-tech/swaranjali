/**
 * Phase 0 scaffolding: an outlined box drawn at exact geometry, labelled with
 * its own measured size.
 *
 * These exist so the three layouts can be eyeballed on the real devices before
 * any instrument code is written. Each is replaced by the real component in
 * Phase 1 and this module goes away with the last one.
 */

export interface Region {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** A second line of text, for anything worth reading off the device. */
  note?: string;
  tone?: 'wood' | 'cloth' | 'ivory' | 'brass';
}

export function regionBox(region: Region): HTMLElement {
  const el = document.createElement('div');
  el.className = `region region--${region.tone ?? 'wood'}`;
  el.style.left = `${region.x}px`;
  el.style.top = `${region.y}px`;
  el.style.width = `${region.w}px`;
  el.style.height = `${region.h}px`;

  const name = document.createElement('span');
  name.className = 'region__name';
  name.textContent = region.name;

  const size = document.createElement('span');
  size.className = 'region__size';
  size.textContent = `${Math.round(region.w)} × ${Math.round(region.h)}`;

  el.append(name, size);

  if (region.note !== undefined) {
    const note = document.createElement('span');
    note.className = 'region__note';
    note.textContent = region.note;
    el.append(note);
  }

  return el;
}

/** Draw a set of regions into a fresh absolutely-positioned container. */
export function regionStage(regions: readonly Region[]): HTMLElement {
  const stage = document.createElement('div');
  stage.className = 'regions';
  for (const region of regions) stage.appendChild(regionBox(region));
  return stage;
}
