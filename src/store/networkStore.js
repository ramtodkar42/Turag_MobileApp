import createStore from './createStore';

// Network connectivity, shared app-wide (the offline banner, the API client's
// fail-fast, and data hooks that retry when the connection returns).
//
// Primary source of truth is @react-native-community/netinfo. It's a native
// module, so a build that doesn't have it yet (old APK) falls back to the
// reactive signals the API client reports (a request that fails with a network
// error = offline; one that gets a response = online). That keeps the JS safe
// to ship before the native rebuild.
let NetInfo = null;
try {
  // eslint-disable-next-line global-require
  NetInfo = require('@react-native-community/netinfo').default;
} catch {
  NetInfo = null;
}
const hasNetInfo = !!NetInfo;

const store = createStore({ online: true });
const reconnectListeners = new Set();
let unsubscribe = null;

// isConnected false => offline. isInternetReachable can be null (unknown) early
// on - treat unknown as online so we never wrongly block the user.
const stateIsOnline = state =>
  state?.isConnected !== false && state?.isInternetReachable !== false;

const setOnline = next => {
  const was = store.get().online;
  if (was === next) {
    return;
  }
  store.set(s => ({ ...s, online: next }));
  if (!was && next) {
    // Back online: let data hooks retry what failed while offline.
    reconnectListeners.forEach(cb => {
      try {
        cb();
      } catch {
        // a listener must never break the others
      }
    });
  }
};

// Started once from useAppBoot. No-op (safe) when NetInfo isn't in the build.
export const startNetworkWatch = () => {
  if (!hasNetInfo || unsubscribe) {
    return;
  }
  try {
    unsubscribe = NetInfo.addEventListener(state => setOnline(stateIsOnline(state)));
    NetInfo.fetch()
      .then(state => setOnline(stateIsOnline(state)))
      .catch(() => {});
  } catch {
    // Native module missing in this build: stay optimistic + use the reports.
  }
};

// The API client reads this to fail fast when we already know we're offline.
export const getOnline = () => store.get().online;

// Reactive fallback (only when NetInfo isn't available): the client reports a
// request's outcome so the banner/fail-fast still work before the rebuild.
export const reportOffline = () => {
  if (!hasNetInfo) {
    setOnline(false);
  }
};
export const reportOnline = () => {
  if (!hasNetInfo) {
    setOnline(true);
  }
};

// Subscribe to offline -> online transitions (returns an unsubscribe fn).
export const onReconnect = cb => {
  reconnectListeners.add(cb);
  return () => reconnectListeners.delete(cb);
};

export const useOnline = () => store.use(s => s.online);
