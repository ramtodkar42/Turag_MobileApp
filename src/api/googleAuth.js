import { ApiError } from './client';
import { GOOGLE_REDIRECT_URL, SUPABASE_URL } from './config';
import { tNow } from '../i18n';

// The secure browser tab is a native module: loaded on first use, so a build
// without it says "not available" instead of crashing.
let InAppBrowser = null;
try {
  InAppBrowser = require('react-native-inappbrowser-reborn').InAppBrowser;
} catch {
  InAppBrowser = null;
}

export const GOOGLE_UNAVAILABLE = 'GOOGLE_UNAVAILABLE';

// Whether this app can offer "Continue with Google" at all.
export const googleSignInConfigured = !!SUPABASE_URL;

// The token Supabase puts on the return link (after "#", sometimes "?"):
// turag://auth/callback#access_token=...&refresh_token=...&expires_in=3600
export const supabaseTokenFrom = url => {
  const at = Math.max(url.indexOf('#'), url.indexOf('?'));
  const params = new URLSearchParams(at >= 0 ? url.slice(at + 1) : '');
  const token = params.get('access_token');
  if (token) return token;
  const reason = params.get('error_description') || params.get('error');
  throw new ApiError({ code: 'GOOGLE_FAILED', message: reason ? reason.replace(/\+/g, ' ') : tNow('auth.google.error') });
};

// "Continue with Google" (as the web's startGoogleSignIn): Supabase's Google
// sign-in in a secure browser tab - Chrome Custom Tabs on Android, Apple's
// sign-in sheet on iPhone (Google refuses sign-in inside an app's web view).
// When Google is done, Supabase sends the user back to the app on
// GOOGLE_REDIRECT_URL and the tab closes. Returns the Supabase token for
// POST /auth/google, or null when the user closed the tab.
export const openGoogleSignIn = async () => {
  const unavailable = () => new ApiError({ code: GOOGLE_UNAVAILABLE, message: tNow('auth.google.unavailable') });
  if (!InAppBrowser || !googleSignInConfigured) throw unavailable();
  const available = await InAppBrowser.isAvailable().catch(() => false);
  if (!available) throw unavailable();

  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(GOOGLE_REDIRECT_URL)}`;
  let result;
  try {
    result = await InAppBrowser.openAuth(url, GOOGLE_REDIRECT_URL, {
      // iOS: remember the Google account between sign-ins.
      ephemeralWebSession: false,
      // Android: a clean tab in the app's colour, not left in the recent apps.
      showTitle: false,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
      showInRecents: false,
      toolbarColor: '#E82127',
    });
  } catch {
    throw unavailable();
  }
  if (result?.type !== 'success' || !result.url) return null; // closed / cancelled
  return supabaseTokenFrom(result.url);
};
