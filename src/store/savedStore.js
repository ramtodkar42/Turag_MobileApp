import createStore from './createStore';
import {
  getSavedVehicles,
  removeSavedVehicle,
  resetMockSaved,
  saveVehicle,
} from '../api/services/saved.api';
import { getVehicleDetails } from '../api/services/vehicle.api';
import { persistStore, readCache, removeCache } from '../utils/persistentCache';
import { clearQueue, enqueueSaved, hydrateQueue, resolveSaved } from './offlineQueue';
import { tNow } from '../i18n';

// Saved vehicles, newest first. Shared by the hearts (Home, vehicle page) and
// the Saved tab.
// - Tapping a heart updates the screen at once, then syncs with the API
//   (undone if it fails).
// - loadSaved() fetches the list from the backend (first load shows
//   placeholders; later loads are quiet). Hearts tapped while it runs win.
const INITIAL = { items: [], loaded: false, loading: false, error: '' };
const store = createStore(INITIAL);

// Hearts tapped but not yet confirmed by the API: id -> { saved, vehicle }.
const inFlight = new Map();
let pending = null;
let generation = 0;

const setItems = update => store.set(s => ({ ...s, items: update(s.items) }));
const remove = id => setItems(list => list.filter(v => v.id !== id));
const add = vehicle => setItems(list => [vehicle, ...list.filter(v => v.id !== vehicle.id)]);

// Offline support: show the last session's list instantly (and when offline),
// keep it in sync on disk, and replay any queued save/un-save when back online.
// v2: older caches stored the photo url, but saved-listings photos are
// short-lived signed links that expire - a cached url is dead next session. We
// now cache WITHOUT the photo (text only) and always re-fetch fresh photos on
// load (enrichImages); the key bump drops any stale v1 cache.
const CACHE_KEY = 'saved-vehicles-v2';
readCache(CACHE_KEY).then(cached => {
  if (cached?.length) {
    // Only if nothing has loaded yet, so a live load always wins.
    store.set(s => (s.loaded || s.items.length ? s : { ...s, items: cached, loaded: true }));
  }
});
persistStore(store, CACHE_KEY, s => s.items.map(({ image, imagePending, ...rest }) => rest));
hydrateQueue();

export const isSaved = id => store.get().items.some(v => v.id === id);

// The saved-listings API returns each saved vehicle without a photo (its
// summary omits the signed hero URL), so cards would show "No image". Fill each
// one in from its current listing detail - a few at a time, and only for cards
// that don't already have a photo (hearts added this session already carry
// theirs). Photos appear progressively; a failed/left listing just stays
// without one. `run` drops late updates if the list was cleared / reloaded.
const PHOTO_CONCURRENCY = 4;
const enrichImages = async run => {
  const missing = store
    .get()
    .items.filter(v => !v.image?.uri)
    .map(v => v.id);
  if (missing.length === 0) {
    return;
  }
  // Show a pulsing skeleton on the cards whose photo we're about to fetch.
  const pendingSet = new Set(missing);
  setItems(list => list.map(v => (pendingSet.has(v.id) ? { ...v, imagePending: true } : v)));

  let next = 0;
  const worker = async () => {
    while (next < missing.length && run === generation) {
      const id = missing[next++];
      let image = null;
      try {
        const details = await getVehicleDetails(id);
        image = details?.image?.uri ? details.image : null;
      } catch {
        // Listing gone / request failed: leave this card without a photo.
      }
      if (run === generation) {
        // Stop the skeleton; show the photo, or fall back to "No image".
        setItems(list =>
          list.map(v => (v.id === id ? { ...v, image: image ?? v.image, imagePending: false } : v)),
        );
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(PHOTO_CONCURRENCY, missing.length) }, worker),
  );
};

export const loadSaved = () => {
  if (pending) {
    return pending;
  }
  const run = generation;
  store.set(s => ({ ...s, loading: !s.loaded, error: '' }));
  pending = getSavedVehicles()
    .then(list => {
      if (run !== generation) {
        return;
      }
      // The saved-listings API always omits the photo, so a fresh load would
      // blank the images we already filled in (a visible blink) until they
      // re-fetch. Keep the photo we already have for each vehicle.
      const prevImage = new Map(store.get().items.map(v => [v.id, v.image]));
      // Apply hearts that are still on their way to the server.
      let items = list
        .filter(v => !inFlight.has(v.id))
        .map(v => (v.image?.uri ? v : { ...v, image: prevImage.get(v.id) ?? v.image }));
      inFlight.forEach(({ saved, vehicle }) => {
        if (saved) {
          items = [vehicle, ...items];
        }
      });
      store.set(s => ({ ...s, items, loaded: true }));
      // Fetch only the photos still missing (new saves); kept ones are skipped.
      enrichImages(run);
    })
    .catch(e => {
      if (run === generation) {
        store.set(s => (s.loaded ? s : { ...s, error: e.message || tNow('errors.loadSaved') }));
      }
    })
    .finally(() => {
      if (run === generation) {
        pending = null;
        store.set(s => ({ ...s, loading: false }));
      }
    });
  return pending;
};

export const toggleSaved = async vehicle => {
  const wasSaved = isSaved(vehicle.id);
  if (wasSaved) {
    remove(vehicle.id);
  } else {
    add(vehicle);
  }
  inFlight.set(vehicle.id, { saved: !wasSaved, vehicle });
  try {
    await (wasSaved ? removeSavedVehicle(vehicle.id) : saveVehicle(vehicle));
    // Synced: drop any earlier queued change for this vehicle.
    resolveSaved(vehicle.id);
  } catch (e) {
    if (e?.isNetworkError) {
      // Offline: keep the heart as the user left it and sync when back online.
      enqueueSaved(vehicle.id, wasSaved ? 'unsave' : 'save', vehicle);
    } else if (wasSaved) {
      add(vehicle);
    } else {
      remove(vehicle.id);
    }
  } finally {
    if (inFlight.get(vehicle.id)?.saved === !wasSaved) {
      inFlight.delete(vehicle.id);
    }
  }
};

export const useSavedVehicles = () => store.use(s => s.items);

// { loaded, loading, error } for the Saved tab.
export const useSavedStatus = () => {
  const loaded = store.use(s => s.loaded);
  const loading = store.use(s => s.loading);
  const error = store.use(s => s.error);
  return { loaded, loading, error };
};

export const useIsSaved = id => store.use(s => s.items.some(v => v.id === id));

export const clearSaved = () => {
  generation += 1;
  pending = null;
  inFlight.clear();
  resetMockSaved();
  clearQueue();
  removeCache(CACHE_KEY);
  store.set(INITIAL);
};
