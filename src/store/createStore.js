import { useSyncExternalStore } from 'react';

// Minimal app-wide store (no library): get / set / subscribe + a React hook.
// const store = createStore([]); store.set(prev => [...prev, x]); store.use();
export default function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  const get = () => state;

  const set = updater => {
    state = typeof updater === 'function' ? updater(state) : updater;
    listeners.forEach(listener => listener());
  };

  const subscribe = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // Optional selector picks part of the state; it must return a stable value.
  const use = (selector = s => s) =>
    useSyncExternalStore(subscribe, () => selector(state));

  return { get, set, subscribe, use };
}
