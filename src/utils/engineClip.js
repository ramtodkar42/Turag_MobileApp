import { NativeModules } from 'react-native';
import { base64ToBytes } from '../api/upload';
import {
  DEFAULT_FRAME_COUNT,
  FRAME_MAX_DIM,
  computeAudioSignals,
  fitFramesToBudget,
  sampleTimes,
  selectIdleWindow,
  usableDuration,
} from '../vendor/selfInspectionLogic';

// The engine clip's frames and sound for QC's checks, measured on the phone as the web
// does in the browser (the same rules: src/vendor/selfInspectionLogic.js). The phone only
// reads the clip (EngineClip, native); nothing here is shown to the user. Builds without
// the native part read nothing: no frames, and the sound counts as "not measured".
const Clip = NativeModules.EngineClip;

const FRAME_QUALITY = 0.72; // the web's JPEG quality
// The web's limits: decoding holds the whole soundtrack in memory.
const MAX_AUDIO_DECODE_BYTES = 100 * 1024 * 1024;
// The engine clip is 30 to 45 seconds; the idle is found well inside this.
const MAX_AUDIO_SECONDS = 120;
// Decoded a piece at a time, so the screen stays responsive.
const CHUNK_CHARS = 512 * 1024;

const yieldToScreen = () => new Promise(resolve => setTimeout(resolve, 0));

// Up to 10 evenly spaced stills, as JPEG data URLs within the server's size budget.
// file: { uri, duration (seconds) }. [] when the clip can't be read.
export const extractEngineFrames = async file => {
  if (!Clip || !file?.uri) return [];
  const times = sampleTimes(usableDuration(file.duration), DEFAULT_FRAME_COUNT);
  const frames = (await Clip.frames(file.uri, times, FRAME_MAX_DIM, FRAME_QUALITY)) ?? [];
  return fitFramesToBudget(frames.filter(f => f?.base64).map(f => `data:image/jpeg;base64,${f.base64}`));
};

// 16-bit PCM (base64) -> samples between -1 and 1.
const decodePcm = async base64 => {
  const parts = [];
  // Whole groups of 4 characters, so each piece decodes on its own.
  for (let i = 0; i < base64.length; i += CHUNK_CHARS) {
    parts.push(base64ToBytes(base64.slice(i, i + CHUNK_CHARS)));
    await yieldToScreen();
  }
  const length = parts.reduce((n, p) => n + p.length, 0);
  const bytes = new Uint8Array(length - (length % 2));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part.subarray(0, Math.min(part.length, bytes.length - offset)), offset);
    offset += part.length;
  }
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(bytes.length / 2);
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
};

// The engine's idle measured from the soundtrack: { durationSec, loudnessDbfs,
// stabilityCv, transientsPerSec }, or null (no audio, too big, too little idle or
// can't be decoded), which QC sees as "not measured".
export const measureEngineSound = async file => {
  if (!Clip || !file?.uri || (file.fileSize ?? 0) > MAX_AUDIO_DECODE_BYTES) return null;
  const pcm = await Clip.sound(file.uri, MAX_AUDIO_SECONDS);
  if (!pcm?.base64 || !(pcm.sampleRate > 0)) return null;
  const samples = await decodePcm(pcm.base64);
  const idle = selectIdleWindow(samples, pcm.sampleRate);
  if (!idle) return null;
  return computeAudioSignals(samples.subarray(idle.start, idle.start + idle.length), pcm.sampleRate);
};
