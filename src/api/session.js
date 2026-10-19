import { ApiError, setAuthHandler } from './client';
import { refreshSession, revokeSession } from './services/auth.api';
import { clearSession, loadSession, saveSession } from './tokenStorage';

// The signed-in session.
// - Access token: memory only, short-lived (about 15 min). Refreshed just before
//   it expires, so requests rarely wait.
// - Refresh token + cached user: keychain (tokenStorage), so the app opens
//   straight into Home next time.
// - Refresh is single-flight: parallel requests share one refresh. Two refreshes
//   with the same token would look like token theft to the backend, which then
//   signs the user out everywhere.

// Refresh a little early so a request never leaves with a token that dies on the way.
const EXPIRY_MARGIN_MS = 30000;

let accessToken = null;
let accessExpiresAt = 0;
// What is in the keychain: { refreshToken, user, pending }.
let stored = null;
let refreshing = null;
const expiredListeners = new Set();

const setAccess = (token, expiresIn) => {
  accessToken = token;
  accessExpiresAt = Date.now() + expiresIn * 1000;
};

const persist = next => {
  stored = next;
  return saveSession(next);
};

const notifyExpired = () => expiredListeners.forEach(listener => listener());

// Forget everything on this device. `remote`: also end the session on the server
// (in the background - signing out never waits for the network).
export const endSession = async ({ remote = false } = {}) => {
  const token = stored?.refreshToken;
  accessToken = null;
  accessExpiresAt = 0;
  stored = null;
  refreshing = null;
  if (remote && token) {
    revokeSession(token).catch(() => {});
  }
  await clearSession();
};

const doRefresh = async () => {
  const token = stored?.refreshToken;
  if (!token) {
    return null;
  }
  try {
    const next = await refreshSession(token);
    setAccess(next.accessToken, next.expiresIn);
    // Save the rotated token before anything else can use the old one.
    await persist({ ...stored, refreshToken: next.refreshToken });
    return accessToken;
  } catch (e) {
    if (e instanceof ApiError && e.isAuthError) {
      // The session is over (expired, revoked or reused): sign in again.
      await endSession();
      notifyExpired();
      return null;
    }
    // Offline / server busy: keep the session, the caller shows the error.
    throw e;
  }
};

export const refreshAccessToken = () => {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
};

export const getAccessToken = async () => {
  if (accessToken && Date.now() < accessExpiresAt - EXPIRY_MARGIN_MS) {
    return accessToken;
  }
  return stored?.refreshToken ? refreshAccessToken() : null;
};

setAuthHandler({ getAccessToken, refreshAccessToken });

// After OTP verify: keep the new session. `pending`: sign-up steps still to do.
export const startSession = async ({ accessToken: token, expiresIn, refreshToken, user, pending = null }) => {
  setAccess(token, expiresIn);
  await persist({ refreshToken, user, pending });
};

// Update the cached user / pending steps (e.g. after Create Account).
export const updateSession = async changes => {
  if (stored) {
    await persist({ ...stored, ...changes });
  }
};

// App start: the saved session, or null when signed out. No network call, so
// the app can open on the right screen at once.
export const restoreSession = async () => {
  stored = await loadSession();
  return stored ? { user: stored.user, pending: stored.pending ?? null } : null;
};

export const hasSession = () => !!stored?.refreshToken;

// Called when the backend says the session is over. Returns an unsubscribe function.
export const onSessionExpired = listener => {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
};
