import { removeSavedVehicle, saveVehicle } from '../api/services/saved.api';
import { getOnline, onReconnect } from './networkStore';
import { readCache, removeCache, writeCache } from '../utils/persistentCache';

// Save / un-save actions made while offline, replayed when the connection
// returns. The heart updates on screen straight away (optimistic); the server
// sync waits here. Keyed by vehicle id so saving then un-saving the same
// vehicle offline just cancels out (last action wins). Persisted so a queued
// action survives the app being closed before it syncs.
const KEY = 'offline-saved-queue';
let queue = {}; // id -> { action: 'save' | 'unsave', vehicle }
let hydrated = false;
let flushing = false;

const persist = () => writeCache(KEY, queue);

export const hydrateQueue = async () => {
  if (hydrated) {
    return;
  }
  hydrated = true;
  const saved = await readCache(KEY);
  if (saved && typeof saved === 'object') {
    queue = saved;
  }
  if (getOnline()) {
    flushQueue();
  }
};

export const enqueueSaved = (id, action, vehicle) => {
  queue[id] = { action, vehicle };
  persist();
};

export const resolveSaved = id => {
  if (queue[id]) {
    delete queue[id];
    persist();
  }
};

export const flushQueue = async () => {
  if (flushing || !getOnline()) {
    return;
  }
  const ids = Object.keys(queue);
  if (ids.length === 0) {
    return;
  }
  flushing = true;
  try {
    for (const id of ids) {
      const entry = queue[id];
      if (!entry) {
        continue;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        await (entry.action === 'save' ? saveVehicle(entry.vehicle) : removeSavedVehicle(id));
        delete queue[id];
        persist();
      } catch (e) {
        if (e?.isNetworkError) {
          break; // still offline: keep the rest for next time
        }
        // A real failure (e.g. the listing is gone): drop it so it can't wedge
        // the queue forever. The save/un-save APIs already treat 409/404 as ok.
        delete queue[id];
        persist();
      }
    }
  } finally {
    flushing = false;
  }
};

export const clearQueue = () => {
  queue = {};
  removeCache(KEY);
};

// Sync automatically as soon as the connection returns.
onReconnect(() => flushQueue());
