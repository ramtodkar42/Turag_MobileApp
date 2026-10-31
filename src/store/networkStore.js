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

// slow: how many ordinary requests have been waiting longer than usual.
const store = createStore({ online: true, slow: 0 });
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

// A request that's taking longer than usual (the API client calls this once
// it has waited a while; the returned function when it's done). While any is
// waiting the top bar says the connection is slow, so a long loader never
// looks like a frozen app.
export const markSlow = () => {
  store.set(s => ({ ...s, slow: s.slow + 1 }));
  let done = false;
  return () => {
    if (done) return;
    done = true;
    store.set(s => ({ ...s, slow: Math.max(0, s.slow - 1) }));
  };
};

// What the top bar shows: 'offline', 'slow' or null (nothing).
export const useNetworkNotice = () =>
  store.use(s => {
    if (!s.online) return 'offline';
    return s.slow > 0 ? 'slow' : null;
  });
