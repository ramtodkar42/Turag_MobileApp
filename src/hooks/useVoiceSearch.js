import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { useLanguage } from '../i18n';

// The phone's own speech recognition (android/.../voice/VoiceSearchModule.kt),
// like the web's mic: speech becomes text on the phone - no backend, no key.
// Not on iOS yet (no native module there): `available` is false and the mic
// is hidden.
const Voice = NativeModules.VoiceSearch;
const emitter = Voice ? new NativeEventEmitter(Voice) : null;

// App language -> recognition language (Indian English / Hindi / Marathi).
const LOCALES = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

// Error code -> message key (shown under the search bar for a few seconds).
const ERROR_KEYS = {
  no_match: 'home.voice.noMatch',
  permission: 'home.voice.permission',
  network: 'home.voice.network',
  unavailable: 'home.voice.unavailable',
};
const HINT_MS = 3500;

const askMicPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

// Voice search. onPartial(text): words so far (fill the box live);
// onResult(text): the final text (run the search).
// Returns { available, listening, level (0..1), hintKey, toggle, cancel }.
export default function useVoiceSearch({ onPartial, onResult }) {
  const language = useLanguage();
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [hintKey, setHintKey] = useState(null);
  const hintTimer = useRef(null);
  // Latest callbacks for the native events.
  const handlers = useRef({ onPartial, onResult });
  handlers.current = { onPartial, onResult };

  const showHint = useCallback(key => {
    clearTimeout(hintTimer.current);
    setHintKey(key);
    if (key) {
      hintTimer.current = setTimeout(() => setHintKey(null), HINT_MS);
    }
  }, []);

  useEffect(() => {
    if (!emitter) {
      return undefined;
    }
    const subs = [
      emitter.addListener('VoiceSearch_partial', ({ text }) => text && handlers.current.onPartial?.(text)),
      emitter.addListener('VoiceSearch_result', ({ text }) => {
        if (text) {
          handlers.current.onResult?.(text);
        } else {
          showHint('home.voice.noMatch');
        }
      }),
      emitter.addListener('VoiceSearch_level', ({ level: next }) => setLevel(next)),
      emitter.addListener('VoiceSearch_error', ({ code }) => showHint(ERROR_KEYS[code] ?? 'home.voice.error')),
      emitter.addListener('VoiceSearch_end', () => {
        setListening(false);
        setLevel(0);
      }),
    ];
    return () => {
      subs.forEach(sub => sub.remove());
      Voice.cancel();
      clearTimeout(hintTimer.current);
    };
  }, [showHint]);

  const start = useCallback(async () => {
    showHint(null);
    if (!(await askMicPermission())) {
      showHint('home.voice.permission');
      return;
    }
    try {
      setListening(true);
      const started = await Voice.start(LOCALES[language] ?? LOCALES.en);
      if (!started) {
        setListening(false);
      }
    } catch {
      setListening(false);
      showHint('home.voice.error');
    }
  }, [language, showHint]);

  // Tap: start listening, or stop (what was said so far is still searched).
  const toggle = useCallback(() => {
    if (listening) {
      Voice.stop();
    } else {
      start();
    }
  }, [listening, start]);

  // Stop without searching (e.g. the search bar closes).
  const cancel = useCallback(() => {
    if (listening) {
      Voice.cancel();
      setListening(false);
      setLevel(0);
    }
  }, [listening]);

  return { available: !!Voice, listening, level, hintKey, toggle, cancel };
}
