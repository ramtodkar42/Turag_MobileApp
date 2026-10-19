import { useSyncExternalStore } from 'react';

// Tiny app-wide store for the signed-up user (no library needed).
// Shape: { fullName, contact (mobile), email, photo: { uri, ... } | null, role } | null
let user = null;
const listeners = new Set();

const subscribe = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getUser = () => user;

export const setUser = updates => {
  user = { ...user, ...updates };
  listeners.forEach(listener => listener());
};

export const clearUser = () => {
  user = null;
  listeners.forEach(listener => listener());
};

export const useUser = () => useSyncExternalStore(subscribe, getUser);














