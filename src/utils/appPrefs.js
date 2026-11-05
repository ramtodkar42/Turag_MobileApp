import { createAsyncStorage } from '@react-native-async-storage/async-storage';

// Small, non-secret app settings kept on the device.
// Unlike the keychain (which on iOS survives uninstalling the app), this is
// wiped on uninstall - so it also tells us when the app was freshly installed.
const storage = createAsyncStorage('turag-prefs');

const KEYS = {
  INSTALLED: 'installed', // set on the first launch after install
  INTRO_SEEN: 'introSeen', // the intro slides were finished or skipped
  GUEST: 'guestBrowsing', // chose "Browse cars without login": open on the marketplace
};

// A failed read counts as "not set" and a failed write is ignored: at worst
// the intro shows once more.
const isSet = async key => {
  try {
    return (await storage.getItem(key)) === '1';
  } catch {
    return false;
  }
};

const set = async key => {
  try {
    await storage.setItem(key, '1');
  } catch {
    // Not fatal.
  }
};

// Plain values for screens that remember small things (e.g. the inspector's
// current step). Errors read as null / are ignored, like the flags above.
export const readPref = async key => {
  try {
    return await storage.getItem(key);
  } catch {
    return null;
  }
};

export const writePref = async (key, value) => {
  try {
    await storage.setItem(key, String(value));
  } catch {
    // Not fatal.
  }
};

export const removePref = async key => {
  try {
    await storage.removeItem(key);
  } catch {
    // Not fatal.
  }
};

// The update prompt (both platforms): true if it may show now, and marks it as shown,
// so someone who says "not now" isn't asked again on every open.
const UPDATE_PROMPT_KEY = 'updatePromptAt';
const UPDATE_PROMPT_EVERY_MS = 24 * 60 * 60 * 1000;
export const claimUpdatePrompt = async () => {
  const last = Number(await readPref(UPDATE_PROMPT_KEY)) || 0;
  if (Date.now() - last < UPDATE_PROMPT_EVERY_MS) return false;
  await writePref(UPDATE_PROMPT_KEY, Date.now());
  return true;
};

export const hasSeenIntro = () => isSet(KEYS.INTRO_SEEN);
export const markIntroSeen = () => set(KEYS.INTRO_SEEN);

export const hasChosenGuest = () => isSet(KEYS.GUEST);
export const markGuestChosen = () => set(KEYS.GUEST);

// True only on the first launch after (re)installing the app, then marked.
// If storage can't be read at all, it's treated as NOT a fresh install, so a
// storage error never signs the user out.
export const checkFreshInstall = async () => {
  let installed;
  try {
    installed = await storage.getItem(KEYS.INSTALLED);
  } catch {
    return false;
  }
  if (installed === '1') {
    return false;
  }
  await set(KEYS.INSTALLED);
  return true;
};
