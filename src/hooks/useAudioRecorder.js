import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { createSound, isAudioAvailable, meterToLevel } from '../utils/audio';
import { tNow } from '../i18n';

const MAX_BARS = 28;

const askMicrophone = async () => {
  if (Platform.OS !== 'android') {
    return true; // iOS asks on first record (Info.plist text)
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: tNow('common.audio.permTitle'),
    message: tNow('common.audio.permMessage'),
    buttonPositive: tNow('common.allow'),
    buttonNegative: tNow('common.notNow'),
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

// WhatsApp-style voice note: record (auto-stops at maxMs), play/pause, delete.
// status: 'idle' | 'recording' | 'recorded' | 'playing'
// levels: recent loudness values (0..1) for the bars.
export default function useAudioRecorder({ maxMs = 30000, onRecorded } = {}) {
  const soundRef = useRef(null);
  const pausedRef = useRef(false); // paused mid-playback -> resume, don't restart
  const [status, setStatus] = useState('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [levels, setLevels] = useState([]);
  const [uri, setUri] = useState(null);
  const [error, setError] = useState('');

  const sound = () => {
    if (!soundRef.current) {
      soundRef.current = createSound();
    }
    return soundRef.current;
  };

  // Stop everything if the screen closes mid-recording / mid-playback.
  useEffect(
    () => () => {
      const s = soundRef.current;
      if (s) {
        s.removeRecordBackListener();
        s.removePlayBackListener();
        s.removePlaybackEndListener();
        s.stopRecorder().catch(() => {});
        s.stopPlayer().catch(() => {});
      }
    },
    [],
  );

  const stop = useCallback(async () => {
    const s = sound();
    s.removeRecordBackListener();
    const path = await s.stopRecorder();
    setUri(path);
    setStatus('recorded');
    setDurationMs(prev => prev || elapsedMs);
    onRecorded?.({ uri: path });
  }, [elapsedMs, onRecorded]);


  const start = useCallback(async () => {
    setError('');
    if (!isAudioAvailable) {
      setError(tNow('common.audio.unavailable'));
      return;
    }
    if (!(await askMicrophone())) {
      setError(tNow('common.audio.allowMic'));
      return;
    }
    const s = sound();
    if (!s) {
      setError(tNow('common.audio.unavailable'));
      return;
    }
    setLevels([]);
    setElapsedMs(0);
    setDurationMs(0);
    s.addRecordBackListener(e => {
      setElapsedMs(e.currentPosition);
      setLevels(prev => [...prev, meterToLevel(e.currentMetering)].slice(-MAX_BARS));
    });
    try {
      await s.startRecorder(undefined, undefined, true);
      setStatus('recording');
    } catch (e) {
      s.removeRecordBackListener();
      setError(e.message || tNow('common.audio.couldNotStart'));
    }
  }, []);

  // Auto-stop at the limit (e.g. 30 s).
  useEffect(() => {
    if (status === 'recording' && elapsedMs >= maxMs) {
      setDurationMs(maxMs);
      stop();
    }
  }, [status, elapsedMs, maxMs, stop]);

  const play = useCallback(async () => {
    const s = sound();
    if (pausedRef.current) {
      pausedRef.current = false;
      await s.resumePlayer();
      setStatus('playing');
      return;
    }
    s.addPlayBackListener(e => setElapsedMs(e.currentPosition));
    s.addPlaybackEndListener(() => {
      s.removePlayBackListener();
      setElapsedMs(0);
      setStatus('recorded');
    });
    await s.startPlayer(uri);
    setStatus('playing');
  }, [uri]);

  const pause = useCallback(async () => {
    await sound().pausePlayer();
    pausedRef.current = true;
    setStatus('recorded');
  }, []);

  const discard = useCallback(async () => {
    const s = sound();
    s.removePlayBackListener();
    await s.stopPlayer().catch(() => {});
    pausedRef.current = false;
    setUri(null);
    setLevels([]);
    setElapsedMs(0);
    setDurationMs(0);
    setStatus('idle');
  }, []);

  return {
    available: isAudioAvailable,
    status,
    elapsedMs,
    durationMs,
    levels,
    uri,
    error,
    start,
    stop,
    play,
    pause,
    discard,
  };
}
