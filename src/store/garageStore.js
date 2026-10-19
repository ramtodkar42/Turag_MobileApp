import createStore from './createStore';
import { getGarage, removeFromGarage, resetMockGarage, saveVehicleToGarage } from '../api/services/garage.api';
import { persistStore, readCache, removeCache } from '../utils/persistentCache';
import { tNow } from '../i18n';

// The user's own vehicles (Garage tab), newest first.
// loadGarage() fetches from the backend (first load shows placeholders; later
// loads are quiet); saving adds the vehicle at the top at once.
// Each vehicle carries its active listing (listingId / listingStatus) from the backend.
const INITIAL = { items: [], loaded: false, loading: false, error: '' };
const store = createStore(INITIAL);

let pending = null;
let generation = 0;

// Offline support: show the last session's garage instantly (and offline),
// then refresh; keep it in sync on disk.
const CACHE_KEY = 'garage-vehicles';
readCache(CACHE_KEY).then(cached => {
  if (cached?.length) {
    store.set(s => (s.loaded || s.items.length ? s : { ...s, items: cached, loaded: true }));
  }
});
persistStore(store, CACHE_KEY, s => s.items);

const upsert = vehicle =>
  store.set(s => ({ ...s, items: [vehicle, ...s.items.filter(v => v.id !== vehicle.id)] }));

export const loadGarage = () => {
  if (pending) {
    return pending;
  }
  const run = generation;
  store.set(s => ({ ...s, loading: !s.loaded, error: '' }));
  pending = getGarage()
    .then(items => {
      if (run === generation) {
        store.set(s => ({ ...s, loaded: true, items }));
      }
    })
    .catch(e => {
      if (run === generation) {
        store.set(s => (s.loaded ? s : { ...s, error: e.message || tNow('garage.loadError') }));
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

// Saves through the API; re-saving the same vehicle replaces the old entry.
export const saveToGarage = async ({ vehicle, valuation, inspected }) => {
  const saved = await saveVehicleToGarage({ vehicle, valuation, inspected });
  upsert(saved);
  return saved;
};

// Removes a vehicle from the garage (DELETE /saved-vehicles/{id}); drops it
// from the list once the backend confirms. Throws on failure so the caller can
// surface it.
export const removeFromGarageById = async id => {
  await removeFromGarage(id);
  store.set(s => ({ ...s, items: s.items.filter(v => v.id !== id) }));
};

// Changes whenever one of the user's listings goes live, so the marketplace
// knows to reload.
export const useListedCount = () =>
  store.use(s => s.items.filter(v => v.listingStatus === 'LIVE').length);

export const useGarage = () => store.use(s => s.items);

// Whether this vehicle (by backend vehicleId) is already in the Garage.
export const useIsInGarage = vehicleId =>
  store.use(s => !!vehicleId && s.items.some(v => v.vehicleId === vehicleId));

// { loaded, loading, error } for the Garage tab.
export const useGarageStatus = () => {
  const loaded = store.use(s => s.loaded);
  const loading = store.use(s => s.loading);
  const error = store.use(s => s.error);
  return { loaded, loading, error };
};

export const clearGarage = () => {
  generation += 1;
  pending = null;
  resetMockGarage();
  removeCache(CACHE_KEY);
  store.set(INITIAL);
};
