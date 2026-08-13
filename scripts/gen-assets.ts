/**
 * Generates the app icons and the iOS launch screens from one source — the
 * anjali mark, drawn here as maths rather than stored as art.
 *
 * The mark is a cupped bowl with a single note held above it: swara and
 * anjali, the offering gesture the app is named for. Brass on rosewood, no
 * gradient, no shadow. It is the same form as the mark on the "Tap to begin"
 * screen, which is drawn as inline SVG.
 *
 * Everything lands in public/, which Vite copies verbatim into dist/.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap, rgb } from './png.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKGROUND = rgb('#2A1A12'); // --wood-deep, and the manifest background_color
const MARK = rgb('#B8874A'); // --brass

/** Distance from a point to a circle's outline. */
function ringDistance(dx: number, dy: number, radius: number, halfThickness: number): number {
  return Math.abs(Math.hypot(dx, dy) - radius) - halfThickness;
}

function discDistance(dx: number, dy: number, radius: number): number {
  return Math.hypot(dx, dy) - radius;
}

/**
 * The mark, centred on (cx, cy) and sized to `size` points across. Drawn by
 * signed distance so it stays crisp at 180 px and clean at 512.
 */
function drawMark(bmp: Bitmap, cx: number, cy: number, size: number): void {
  const bowlRadius = size * 0.4;
  const stroke = size * 0.085;
  const half = stroke / 2;
  // The bowl is the lower arc of a circle: everything below this cut line.
  const cutY = cy - size * 0.06;
  const capX = Math.sqrt(Math.max(0, bowlRadius * bowlRadius - (cutY - cy) ** 2));
  const noteRadius = size * 0.115;
  const noteY = cy - size * 0.32;

  const pad = Math.ceil(stroke + 2);
  const minX = Math.max(0, Math.floor(cx - bowlRadius - pad));
  const maxX = Math.min(bmp.width - 1, Math.ceil(cx + bowlRadius + pad));
  const minY = Math.max(0, Math.floor(noteY - noteRadius - pad));
  const maxY = Math.min(bmp.height - 1, Math.ceil(cy + bowlRadius + pad));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const dx = px - cx;
      const dy = py - cy;

      // Arc, clipped to the bowl half and finished with round caps so the
      // ends read as hand-drawn rather than sawn off.
      let d = py >= cutY ? ringDistance(dx, dy, bowlRadius, half) : Infinity;
      d = Math.min(d, discDistance(px - (cx - capX), py - cutY, half));
      d = Math.min(d, discDistance(px - (cx + capX), py - cutY, half));

      // The note held above it.
      d = Math.min(d, discDistance(dx, py - noteY, noteRadius));

      const coverage = 0.5 - d;
      if (coverage > 0) bmp.blend(x, y, MARK, coverage);
    }
  }
}

function write(path: string, bmp: Bitmap): void {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, bmp.encode());
  process.stdout.write(`  ${path}  ${bmp.width}×${bmp.height}\n`);
}

function icon(path: string, size: number, markFraction: number): void {
  const bmp = new Bitmap(size, size);
  bmp.fill(BACKGROUND);
  drawMark(bmp, size / 2, size / 2, size * markFraction);
  write(path, bmp);
}

function launchScreen(w: number, h: number): void {
  const bmp = new Bitmap(w, h);
  bmp.fill(BACKGROUND);
  drawMark(bmp, w / 2, h / 2, Math.min(w, h) * 0.22);
  write(`public/launch/launch-${w}x${h}.png`, bmp);
}

process.stdout.write('Generating icons and launch screens\n');

icon('public/icons/icon-192.png', 192, 0.62);
icon('public/icons/icon-512.png', 512, 0.62);
// Maskable icons are cropped to a circle inscribed in the central 80%, so the
// mark shrinks to stay inside the safe zone.
icon('public/icons/icon-512-maskable.png', 512, 0.46);
icon('public/icons/apple-touch-icon-180.png', 180, 0.62);

// Device pixel sizes from the table in doc 12.
launchScreen(1640, 2360); // iPad Air 10.9" portrait
launchScreen(2360, 1640); // iPad Air 10.9" landscape
launchScreen(1179, 2556); // iPhone 15/16 / Pro portrait
launchScreen(2556, 1179); // iPhone 15/16 / Pro landscape
launchScreen(1290, 2796); // iPhone Plus / Pro Max portrait
launchScreen(2796, 1290); // iPhone Plus / Pro Max landscape
