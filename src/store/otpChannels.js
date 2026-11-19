import { getOtpChannels } from '../api/services/auth.api';
import { readPref, writePref } from '../utils/appPrefs';

// How the login code can be sent (['whatsapp', 'sms'], ...), remembered on the
// phone so Login shows its real buttons ("Continue with WhatsApp", SMS beside
// Google) from its first frame. Asking the server only when Login opened left
// "Get OTP" and no SMS / Google row on screen for a moment on every app start.
// Kept in the app prefs (not the sign-out cache): Login is exactly what shows
// after signing out.
const KEY = 'otpChannels';
const VALID = new Set(['whatsapp', 'sms']);
// An answer this fresh isn't asked for again (app start, then Login opening).
const FRESH_MS = 60 * 1000;

let known = null; // the last known answer, or null
let askedAt = 0; // when the server last answered
let asking = null; // the request in flight, shared

const clean = list => (Array.isArray(list) ? list.filter(c => VALID.has(c)) : []);

// What Login shows first: the channels known now ([] = not known: one "Get OTP").
export const knownOtpChannels = () => known ?? [];

// Asks the server (one request at a time, not again within a minute). A failed or
// empty answer keeps what's known (offline must not turn "Continue with WhatsApp"
// back into "Get OTP"). Resolves to the channels known now.
export const refreshOtpChannels = () => {
  if (known && Date.now() - askedAt < FRESH_MS) {
    return Promise.resolve(known);
  }
  if (!asking) {
    asking = getOtpChannels()
      .then(fresh => {
        const list = clean(fresh);
        if (list.length > 0) {
          if (list.join() !== known?.join()) writePref(KEY, JSON.stringify(list));
          known = list;
          askedAt = Date.now();
        }
        return knownOtpChannels();
      })
      .catch(knownOtpChannels)
      .finally(() => {
        asking = null;
      });
  }
  return asking;
};

// App start (useAppBoot, behind the splash): the answer saved last time - read
// from the phone, no network - and the server is asked in the background.
export const loadOtpChannels = async () => {
  try {
    const saved = clean(JSON.parse((await readPref(KEY)) ?? 'null'));
    if (saved.length > 0 && !known) known = saved;
  } catch {
    // A bad saved value is just ignored.
  }
  refreshOtpChannels();
};

// Nothing saved yet (the first start after install / update) and Login comes
// first: the splash waits for the server's answer, at most `ms`.
export const waitForOtpChannels = ms =>
  new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    refreshOtpChannels().then(() => {
      clearTimeout(timer);
      resolve();
    });
  });

// Tests: start from nothing known.
export const forgetOtpChannels = () => {
  known = null;
  askedAt = 0;
  asking = null;
};
