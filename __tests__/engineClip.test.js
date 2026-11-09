/**
 * The engine clip, read on the phone for QC (the web's running-video check): stills
 * spread across the clip, and the idle's sound measured by the web's own rules.
 */
import { NativeModules } from 'react-native';

const clip = { frames: jest.fn(), sound: jest.fn() };
NativeModules.EngineClip = clip;
// Reads the native module when it loads, so after it's set above.
const { extractEngineFrames, measureEngineSound } = require('../src/utils/engineClip');

const RATE = 16000;
// Mono 16-bit PCM as the native side returns it: { sampleRate, base64 }.
const pcmOf = samples => {
  const ints = new Int16Array(samples.length);
  samples.forEach((s, i) => (ints[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)))));
  return { sampleRate: RATE, base64: global.Buffer.from(ints.buffer).toString('base64') };
};
// Silence while the owner starts the engine, then an even idle (and knocks, if asked).
const recording = ({ silentSec = 3, idleSec = 30, knocksPerSec = 0 } = {}) => {
  const out = new Float32Array((silentSec + idleSec) * RATE);
  for (let i = silentSec * RATE; i < out.length; i += 1) {
    const t = i / RATE;
    out[i] = 0.2 * Math.sin(2 * Math.PI * 30 * t) + 0.1 * Math.sin(2 * Math.PI * 90 * t);
  }
  if (knocksPerSec > 0) {
    const every = Math.round(RATE / knocksPerSec);
    for (let i = silentSec * RATE; i < out.length; i += every) {
      for (let k = 0; k < 40 && i + k < out.length; k += 1) out[i + k] = 0.95;
    }
  }
  return out;
};
const file = { uri: 'file:///engine.mp4', duration: 40, fileSize: 20 * 1024 * 1024 };

beforeEach(() => jest.clearAllMocks());

describe('stills', () => {
  test('10 spread across the clip, at the web\'s size and quality, as JPEG data URLs', async () => {
    clip.frames.mockResolvedValue([{ t: 0.5, base64: 'AAAA' }, { t: 4.6, base64: 'BBBB' }]);
    expect(await extractEngineFrames(file)).toEqual(['data:image/jpeg;base64,AAAA', 'data:image/jpeg;base64,BBBB']);
    const [uri, times, maxDim, quality] = clip.frames.mock.calls[0];
    expect(uri).toBe('file:///engine.mp4');
    expect(times).toHaveLength(10);
    expect(times[0]).toBe(0.5);
    expect(times[9]).toBe(38);
    expect([maxDim, quality]).toEqual([768, 0.72]);
  });

  test('kept within the server\'s size budget, in order', async () => {
    const big = 'A'.repeat(900000);
    clip.frames.mockResolvedValue([1, 2, 3, 4].map(t => ({ t, base64: big })));
    expect(await extractEngineFrames(file)).toHaveLength(2);
  });

  test('an unknown length still asks for stills near the start', async () => {
    clip.frames.mockResolvedValue([]);
    await extractEngineFrames({ uri: 'file:///e.mp4' });
    expect(clip.frames.mock.calls[0][1].slice(0, 2)).toEqual([0.5, 1.5]);
  });
});

describe('sound', () => {
  test('a steady idle: measured over 10 seconds after it settles', async () => {
    clip.sound.mockResolvedValue(pcmOf(recording()));
    const signals = await measureEngineSound(file);
    expect(clip.sound).toHaveBeenCalledWith('file:///engine.mp4', 120);
    expect(signals.durationSec).toBe(10);
    expect(signals.loudnessDbfs).toBeGreaterThan(-25);
    expect(signals.stabilityCv).toBeLessThan(0.35);
    expect(signals.transientsPerSec).toBeLessThan(2);
  });

  test('frequent knocks show up as spikes', async () => {
    clip.sound.mockResolvedValue(pcmOf(recording({ knocksPerSec: 4 })));
    expect((await measureEngineSound(file)).transientsPerSec).toBeGreaterThanOrEqual(2);
  });

  test('not measured: silence, too little idle, no audio track, or a file too big', async () => {
    clip.sound.mockResolvedValueOnce(pcmOf(new Float32Array(30 * RATE)));
    expect(await measureEngineSound(file)).toBeNull();
    clip.sound.mockResolvedValueOnce(pcmOf(recording({ idleSec: 8 })));
    expect(await measureEngineSound(file)).toBeNull();
    clip.sound.mockResolvedValueOnce(null);
    expect(await measureEngineSound(file)).toBeNull();
    clip.sound.mockClear();
    expect(await measureEngineSound({ ...file, fileSize: 150 * 1024 * 1024 })).toBeNull();
    expect(clip.sound).not.toHaveBeenCalled();
  });
});

test('a build without the native part reads nothing', async () => {
  delete NativeModules.EngineClip;
  await jest.isolateModulesAsync(async () => {
    const engineClip = require('../src/utils/engineClip');
    expect(await engineClip.extractEngineFrames(file)).toEqual([]);
    expect(await engineClip.measureEngineSound(file)).toBeNull();
  });
  NativeModules.EngineClip = clip;
});
