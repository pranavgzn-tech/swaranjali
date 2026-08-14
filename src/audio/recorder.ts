/**
 * Session recording.
 *
 * Doc 10 rates this among the most valuable things here: teaching yourself
 * without a teacher means being your own ear, and listening back is where most
 * of the learning happens.
 *
 * It taps the signal after the limiter, so what is captured is what was heard.
 * The microphone is optional and off by default, and — this matters — it is
 * only ever asked for at the moment the user turns it on. Never at startup.
 */

import { saveRecording } from '../state/recordings-db.ts';

/** Safari wants mp4; everything else takes webm. Ask rather than assume. */
const CANDIDATE_TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];

function supportedType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return CANDIDATE_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export class Recorder {
  readonly #ctx: AudioContext;
  readonly #destination: MediaStreamAudioDestinationNode;
  readonly #micGain: GainNode;

  #recorder: MediaRecorder | null = null;
  #chunks: Blob[] = [];
  #startedAt = 0;
  #micStream: MediaStream | null = null;
  #micSource: MediaStreamAudioSourceNode | null = null;

  constructor(ctx: AudioContext, tap: AudioNode) {
    this.#ctx = ctx;
    this.#destination = ctx.createMediaStreamDestination();
    tap.connect(this.#destination);

    // The mic joins the recording only, never the speakers — routing it back
    // out would feed straight back into itself.
    this.#micGain = ctx.createGain();
    this.#micGain.gain.value = 1;
    this.#micGain.connect(this.#destination);
  }

  get recording(): boolean {
    return this.#recorder?.state === 'recording';
  }

  get available(): boolean {
    return supportedType() !== undefined;
  }

  /** Elapsed seconds, for a running counter. */
  get elapsedSeconds(): number {
    return this.recording ? this.#ctx.currentTime - this.#startedAt : 0;
  }

  /**
   * Turn the microphone on or off. Asking for permission happens here and
   * nowhere else, which is why this is the only place `getUserMedia` appears.
   */
  async setMicEnabled(enabled: boolean): Promise<boolean> {
    if (!enabled) {
      this.#micSource?.disconnect();
      this.#micSource = null;
      for (const track of this.#micStream?.getTracks() ?? []) track.stop();
      this.#micStream = null;
      return false;
    }

    if (this.#micStream) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.#micStream = stream;
      this.#micSource = this.#ctx.createMediaStreamSource(stream);
      this.#micSource.connect(this.#micGain);
      return true;
    } catch {
      // Refused, or no microphone. The instrument still records.
      return false;
    }
  }

  start(): boolean {
    if (this.recording) return true;
    const mimeType = supportedType();
    if (mimeType === undefined) return false;

    this.#chunks = [];
    this.#recorder = new MediaRecorder(this.#destination.stream, { mimeType });
    this.#recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.#chunks.push(event.data);
    };
    this.#recorder.start();
    this.#startedAt = this.#ctx.currentTime;
    return true;
  }

  /** Stop and save. Resolves with the recording's id, or null if nothing was captured. */
  async stop(): Promise<string | null> {
    const recorder = this.#recorder;
    if (!recorder || recorder.state !== 'recording') return null;

    const durationMs = Math.round((this.#ctx.currentTime - this.#startedAt) * 1000);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;
    this.#recorder = null;

    if (this.#chunks.length === 0) return null;
    const blob = new Blob(this.#chunks, { type: recorder.mimeType });
    this.#chunks = [];

    const createdAt = Date.now();
    const id = `rec-${createdAt}`;
    await saveRecording({
      id,
      createdAt,
      durationMs,
      label: new Date(createdAt).toLocaleString(),
      blob,
    });
    return id;
  }
}
