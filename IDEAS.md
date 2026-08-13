# IDEAS.md

Things thought of while building that are **not** in the spec. Nothing here gets built
without being asked for.

- **Screenshot the three layouts in CI.** `npm run check-layout` proves the numbers fit;
  a headless browser could prove the pixels do, and post the images to the run. Would add a
  dev dependency, so not done.
- **A "reservoir empty" cue that is felt rather than seen.** Doc 06 has the light dimming
  and cooling. On a phone there is no haptics API, but a very short drop in the air hiss
  just before the reeds stop speaking would read as the instrument running out of breath.
  Possibly already implied by the pressure curve — worth listening for in Phase 4.
- **Remember the last Sa per session time of day.** Ragas are tied to the clock and a
  practice routine usually is too. Almost certainly over-clever; noting it and moving on.
