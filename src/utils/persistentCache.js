import { createAsyncStorage } from '@react-native-async-storage/async-storage';

// On-device JSON cache for "last seen" data (the user's garage, saved vehicles,
// and the offline action queue), so those screens show instantly and keep
// working offline. Wiped on uninstall (like appPrefs) and cleared on sign-out,
// so it never leaks between users. Best-effort: every read/write is guarded.
const storage = createAsyncStorage('turag-cache');

export const readCache = async key => {
  try {
    const raw = await storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeCache = async (key, value) => {
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch {
    // Not fatal: the data still lives in memory for this session.
  }
};

export const removeCache = async key => {
  try {
    await storage.removeItem(key);
  } catch {
    // Not fatal.
  }
};

// Subscribe a createStore() to disk: writes `select(state)` under `key`
// whenever the store changes (debounced so bursts collapse into one write).
export const persistStore = (store, key, select, delay = 400) => {
  let timer = null;
  store.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(() => writeCache(key, select(store.get())), delay);
  });
};
