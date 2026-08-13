/**
 * Fetches the WOFF2 faces the app self-hosts, and writes them into src/fonts/.
 *
 * Run by hand, not by the build: the output is committed, because the app must
 * build and run with no network at all. Re-run it only when the faces change.
 *
 *   node --experimental-strip-types scripts/fetch-fonts.ts
 *
 * All three faces are SIL Open Font License 1.1, which permits redistribution
 * — see src/fonts/OFL.txt and the note in DECISIONS.md.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/fonts');

// A modern desktop UA is what makes Google Fonts serve WOFF2 rather than TTF.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

interface Face {
  file: string;
  family: string;
  weight: number;
  /** Restricts the subset to exactly these characters. */
  text?: string;
}

const FACES: Face[] = [
  { file: 'source-serif-600.woff2', family: 'Source Serif 4', weight: 600 },
  { file: 'source-sans-400.woff2', family: 'Source Sans 3', weight: 400 },
  { file: 'source-sans-600.woff2', family: 'Source Sans 3', weight: 600 },
  // Devanagari is subset to the sargam syllables only, as doc 06 asks.
  { file: 'noto-devanagari-600.woff2', family: 'Noto Sans Devanagari', weight: 600, text: 'सारेगमपधनि' },
];

async function fetchFace(face: Face): Promise<void> {
  const params = new URLSearchParams({
    family: `${face.family}:wght@${face.weight}`,
    display: 'swap',
  });
  if (face.text !== undefined) params.set('text', face.text);

  const css = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
    headers: { 'User-Agent': UA },
  }).then((response) => {
    if (!response.ok) throw new Error(`${face.family}: css ${response.status}`);
    return response.text();
  });

  // Without `text=` the response carries several unicode-range subsets; the
  // last one is latin, which is the only one we want. Subset URLs have no file
  // extension, so match on the format hint rather than the path.
  const urls = [...css.matchAll(/url\((https:[^)]+)\)\s*format\('woff2'\)/g)].map((match) => match[1] ?? '');
  const url = urls[urls.length - 1];
  if (url === undefined) throw new Error(`${face.family}: no woff2 in the stylesheet`);

  const bytes = await fetch(url, { headers: { 'User-Agent': UA } }).then(async (response) => {
    if (!response.ok) throw new Error(`${face.family}: font ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  });

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, face.file), bytes);
  process.stdout.write(`  ${face.file}  ${(bytes.length / 1024).toFixed(1)} KB\n`);
}

process.stdout.write('Fetching self-hosted faces\n');
for (const face of FACES) await fetchFace(face);
process.stdout.write('Committed output — the build never touches the network.\n');
