/**
 * Walks dist/ and writes the precache list into the compiled service worker,
 * along with a content hash that becomes the cache name.
 *
 * Never hand-maintain this list: a missing file means a broken app in
 * aeroplane mode, discovered at the worst possible moment (doc 12).
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SW = join(DIST, 'sw.js');

/** The worker caches everything but itself — a cached sw.js can never update. */
const EXCLUDE = new Set(['sw.js', 'sw.js.map']);

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

const files = walk(DIST)
  .map((full) => relative(DIST, full).split(sep).join('/'))
  .filter((path) => !EXCLUDE.has(path))
  .sort();

if (files.length === 0) throw new Error('dist/ is empty — run vite build first');

const hash = createHash('sha256');
for (const path of files) {
  hash.update(path);
  hash.update(readFileSync(join(DIST, path)));
}
const buildHash = hash.digest('hex').slice(0, 12);

// Navigation requests are served './index.html' from the cache, so the entry
// point is precached under that exact key as well as by its own path.
const precache = files.map((path) => `./${path}`);

const source = readFileSync(SW, 'utf8')
  .replace('"__BUILD_HASH__"', JSON.stringify(buildHash))
  .replace("'__BUILD_HASH__'", JSON.stringify(buildHash))
  .replace('["__PRECACHE__"]', JSON.stringify(precache))
  .replace("['__PRECACHE__']", JSON.stringify(precache));

if (source.includes('__PRECACHE__') || source.includes('__BUILD_HASH__')) {
  throw new Error('sw.js placeholders were not replaced — check pwa/sw.ts');
}

writeFileSync(SW, source);

process.stdout.write(`Precached ${files.length} files as swaranjali-${buildHash}\n`);
