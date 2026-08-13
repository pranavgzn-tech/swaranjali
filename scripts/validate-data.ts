/**
 * Data validation, per doc 07. A malformed taal fails the build rather than
 * surfacing as a rhythm that quietly does not add up.
 *
 * Doc 07 lists the raga, thaat, melakarta and composition rules too; those
 * arrive with their data in Phase 3, and their checks go here beside these.
 */

import { TAALS, vibhagOf } from '../src/music/taal.ts';

let failures = 0;

function check(condition: boolean, message: string): void {
  if (condition) return;
  failures++;
  process.stdout.write(`  FAIL  ${message}\n`);
}

for (const taal of TAALS) {
  const where = `${taal.name}:`;
  const sum = taal.vibhag.reduce((total, section) => total + section, 0);

  check(sum === taal.matras, `${where} vibhag sums to ${sum}, not ${taal.matras}`);
  check(taal.bols.length === taal.matras, `${where} ${taal.bols.length} bols for ${taal.matras} matras`);
  check(taal.matras > 0, `${where} no matras`);
  check(taal.vibhag.every((section) => section > 0), `${where} has an empty vibhag`);

  const inRange = (matra: number): boolean => matra >= 1 && matra <= taal.matras;
  check(inRange(taal.sam), `${where} sam ${taal.sam} is outside 1…${taal.matras}`);
  for (const matra of taal.tali) check(inRange(matra), `${where} tali ${matra} is outside 1…${taal.matras}`);
  for (const matra of taal.khali) check(inRange(matra), `${where} khali ${matra} is outside 1…${taal.matras}`);

  // A matra is clapped or waved, never both.
  for (const matra of taal.tali) {
    check(!taal.khali.includes(matra), `${where} matra ${matra} is marked both tali and khali`);
  }

  // Sections start where the claps and waves fall — that is what they mark.
  const starts = new Set<number>();
  let counted = 1;
  for (const section of taal.vibhag) {
    starts.add(counted);
    counted += section;
  }
  for (const matra of [...taal.tali, ...taal.khali]) {
    check(starts.has(matra), `${where} matra ${matra} is marked but does not start a vibhag`);
  }

  check(vibhagOf(taal, 1) === 0, `${where} matra 1 is not in the first vibhag`);
  check(vibhagOf(taal, taal.matras) === taal.vibhag.length - 1, `${where} the last matra is not in the last vibhag`);

  check(taal.defaultBpm >= 40 && taal.defaultBpm <= 240, `${where} default tempo ${taal.defaultBpm} is outside 40…240`);
}

const playable = TAALS.filter((taal) => taal.verified).length;
process.stdout.write(`Checked ${TAALS.length} taals, ${playable} verified and playable\n`);

if (failures > 0) {
  process.stdout.write(`\n${failures} data check${failures === 1 ? '' : 's'} failed\n`);
  process.exit(1);
}
