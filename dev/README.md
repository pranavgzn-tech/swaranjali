# dev/

Checks that need a real browser, because they exercise Web Audio.

Run `npm run dev` and open the page:

    http://localhost:5173/dev/voice-pool-check.html

Nothing here is part of the production build — Vite only builds `index.html`,
so these pages exist in the dev server and nowhere else.

## voice-pool-check.html

Renders the instrument offline and measures the result, to prove two things
that a type checker cannot:

- a note that has been released actually stops, even after the voice pool has
  run out of never-used voices and starts reusing them
- a note being held is not stopped by other voices being claimed around it

Both compare against a control render with a full reservoir and no notes,
because the air hiss is supposed to be audible — the floor is not silence.

The first of these is a regression test for a real bug: a reused voice deleted
the pool's map entry for whatever key it had played last, which by then could
be a note another voice was still sounding. The note then droned forever,
swelling with the pump and eating air, while the pool reported nothing playing.
