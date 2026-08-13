/**
 * The audio diagnostics page, at `?debug=audio`.
 *
 * Doc 05 asks for this behind five taps on the version number; it is reachable
 * from the URL too, because when there is no sound at all the settings panel is
 * a long way to walk.
 *
 * The important control is **Test tone**: a bare oscillator straight to the
 * destination, past the voice pool, the bellows, the body chain and the
 * limiter. If that is silent the problem is the device or the context; if it
 * sounds and the reeds do not, the problem is mine.
 */

import { audioContext, contextState, nudge } from '../audio/context.ts';
import type { LayoutMount } from '../ui/layouts/layout.ts';
import { madhyaSa } from '../music/pitch.ts';

const TEST_TONE_HZ = 440;
const TEST_TONE_GAIN = 0.2;

export const mountDebugAudio: LayoutMount = (root, _viewport, app) => {
  const page = document.createElement('div');
  page.className = 'debug';

  const heading = document.createElement('h1');
  heading.className = 'debug__heading';
  heading.textContent = 'Audio diagnostics';

  const readout = document.createElement('pre');
  readout.className = 'debug__readout';

  page.append(heading, readout);

  // A bare oscillator, built once and gated by its gain — no allocation on tap
  // and nothing of ours in the path.
  const ctx = audioContext();
  let testGain: GainNode | null = null;
  if (ctx) {
    const osc = ctx.createOscillator();
    osc.frequency.value = TEST_TONE_HZ;
    testGain = ctx.createGain();
    testGain.gain.value = 0;
    osc.connect(testGain).connect(ctx.destination);
    osc.start();
  }

  const hold = (label: string, note: string, down: () => void, up: () => void): HTMLElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'debug__bank';
    button.innerHTML = `<span class="debug__bank-name">${label}</span><span class="debug__bank-note">${note}</span>`;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      nudge();
      down();
    });
    const release = (event: PointerEvent): void => {
      event.preventDefault();
      up();
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    return button;
  };

  page.append(
    hold(
      'Test tone',
      'A plain 440 Hz oscillator straight to the output. Nothing of the instrument is in the way.',
      () => testGain?.gain.setTargetAtTime(TEST_TONE_GAIN, ctx?.currentTime ?? 0, 0.01),
      () => testGain?.gain.setTargetAtTime(0, ctx?.currentTime ?? 0, 0.01),
    ),
  );

  const key = madhyaSa(app.settings.current.sa);
  page.append(
    hold(
      'Reed note',
      'Sa through the full engine, with the air held full for you.',
      () => {
        app.instrument.bellows.startPumping(1);
        app.instrument.noteOn(key);
      },
      () => {
        app.instrument.noteOff(key);
        app.instrument.bellows.stopPumping();
      },
    ),
  );

  root.appendChild(page);

  const tick = window.setInterval(() => {
    const live = audioContext();
    readout.textContent = [
      `context        ${contextState()}`,
      `sample rate    ${live ? live.sampleRate : '—'} Hz`,
      `base latency   ${live?.baseLatency !== undefined ? (live.baseLatency * 1000).toFixed(1) + ' ms' : '—'}`,
      `output latency ${live?.outputLatency !== undefined ? (live.outputLatency * 1000).toFixed(1) + ' ms' : '—'}`,
      `tier           ${app.instrument.tier}`,
      `air pressure   ${app.instrument.bellows.pressure.toFixed(3)}`,
      `pumping        ${app.instrument.bellows.isPumping}`,
      `speaking       ${app.instrument.bellows.speaking}`,
      `active voices  ${app.instrument.activeVoices}`,
      `touch to note  ${app.router.averageLatencyMs.toFixed(2)} ms average`,
      `master fader   ${app.settings.current.faders.master}`,
      `male fader     ${app.settings.current.faders.male}`,
      `output route   ${app.settings.current.outputRoute}`,
    ].join('\n');
  }, 200);

  return () => {
    window.clearInterval(tick);
    app.instrument.noteOff(key);
    app.instrument.bellows.stopPumping();
    page.remove();
  };
};
