/**
 * The bank audition page, reached at `?debug=banks`.
 *
 * Doc 08's first Phase 1 step asks for a way to hear each reed bank alone on a
 * sustained note, so the three harmonic tables can be judged separately rather
 * than as a blend. Hold a button: that bank is soloed, the reservoir is held
 * full, and Sa sounds until you let go.
 *
 * It does not touch saved settings — the stops go back to where they were when
 * the finger lifts.
 */

import { BANK_IDS, FADER_ORDER, type BankId } from '../config/audio.ts';
import { madhyaSa } from '../music/pitch.ts';
import type { LayoutMount } from '../ui/layouts/layout.ts';

const BANK_COPY: Record<BankId, string> = {
  bass: '16′ — body and depth',
  male: '8′ — the main voice',
  female: '4′ — brightness and carry',
};

export const mountDebugBanks: LayoutMount = (root, _viewport, app) => {
  const page = document.createElement('div');
  page.className = 'debug';

  const heading = document.createElement('h1');
  heading.className = 'debug__heading';
  heading.textContent = 'Reed banks';

  const note = document.createElement('p');
  note.className = 'debug__note';
  note.textContent = 'Hold a button to hear that bank alone on Sa, with the air held full.';

  page.append(heading, note);

  const key = madhyaSa(app.settings.current.sa);

  for (const bank of BANK_IDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'debug__bank';
    button.innerHTML = `<span class="debug__bank-name">${bank}</span><span class="debug__bank-note">${BANK_COPY[bank]}</span>`;

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      for (const id of FADER_ORDER) {
        app.instrument.setFader(id, id === bank ? 1 : id === 'master' ? 0.8 : id === 'reverb' ? 0.18 : 0);
      }
      app.instrument.bellows.startPumping(1);
      app.instrument.noteOn(key);
    });

    const stop = (event: PointerEvent): void => {
      event.preventDefault();
      app.instrument.noteOff(key);
      app.instrument.bellows.stopPumping();
      app.applySettings();
    };
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);
    button.addEventListener('pointerleave', stop);

    page.appendChild(button);
  }

  root.appendChild(page);

  return () => {
    app.instrument.noteOff(key);
    app.instrument.bellows.stopPumping();
    app.applySettings();
    page.remove();
  };
};
