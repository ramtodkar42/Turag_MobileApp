import { useCallback } from 'react';
import { I18nManager } from 'react-native';
import createStore from '../store/createStore';
import en from './locales/en';
import hi from './locales/hi';
import mr from './locales/mr';
import { loadLanguage, saveLanguage } from './storage';

// App languages: English (default), Hindi and Marathi.
//
// Screens:      const t = useT();  t('home.search')  t('home.found', { count: 3 })
// Other code:   tNow('errors.network')  (current language, e.g. API errors)
//
// Strings live in locales/<lang>/<area>.js with keys '<area>.<name>'.
// A missing Hindi/Marathi string falls back to English, so nothing is ever blank.
// `{name}` in a string is replaced from params; with params.count, '<key>_one'
// is used for 1 and '<key>_other' otherwise (when they exist).

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];
export const DEFAULT_LANGUAGE = 'en';

const dictionaries = { en, hi, mr };
const isSupported = code => !!dictionaries[code];

const store = createStore({ language: DEFAULT_LANGUAGE });

const warned = new Set();
const lookup = (language, key) => dictionaries[language]?.[key] ?? dictionaries.en[key];

export const translate = (language, key, params) => {
  let text;
  if (params?.count != null) {
    const form = params.count === 1 ? 'one' : 'other';
    text = lookup(language, `${key}_${form}`);
  }
  text = text ?? lookup(language, key);
  if (text == null) {
    if (__DEV__ && !warned.has(key)) {
      warned.add(key);
      console.warn(`[i18n] Missing string: ${key}`);
    }
    return key;
  }
  return params ? text.replace(/\{(\w+)\}/g, (match, name) => (params[name] ?? match)) : text;
};

export const getLanguage = () => store.get().language;

// Translate outside React components, in the current language.
export const tNow = (key, params) => translate(getLanguage(), key, params);

// Current language code; the component re-renders when it changes.
export const useLanguage = () => store.use(s => s.language);

// t(key, params) for the current language.
export const useT = () => {
  const language = useLanguage();
  return useCallback((key, params) => translate(language, key, params), [language]);
};

// Hindi and Marathi use Devanagari, which needs taller lines.
export const isDevanagari = language => language === 'hi' || language === 'mr';

// The phone's language, if the app supports it.
const deviceLanguage = () => {
  const candidates = [];
  try {
    candidates.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // No Intl: try the native constant below.
  }
  try {
    candidates.push(I18nManager.getConstants?.().localeIdentifier);
  } catch {
    // Not available.
  }
  const code = candidates
    .filter(Boolean)
    .map(tag => String(tag).slice(0, 2).toLowerCase())
    .find(isSupported);
  return code ?? DEFAULT_LANGUAGE;
};

// App start: the language the user chose before, else the phone's language.
export const initLanguage = async () => {
  const saved = await loadLanguage();
  const language = isSupported(saved) ? saved : deviceLanguage();
  store.set({ language });
  return language;
};

// Switch language now (every screen updates) and remember it.
export const setLanguage = async language => {
  if (!isSupported(language) || language === getLanguage()) {
    return;
  }
  store.set({ language });
  await saveLanguage(language);
};
