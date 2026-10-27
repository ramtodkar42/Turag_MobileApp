import { Platform } from 'react-native';

// Which backend the app talks to - change BACKEND below, then reload the app.
//
// Local backend (on your PC):
//   cd D:\TuragAI\turag-platform-feat-email-verification\apps\web
//   pnpm exec next dev -p 3001 -H 0.0.0.0
//
// 'usb'      Phone on a USB cable. Run once per connection:
//            adb reverse tcp:3001 tcp:3001
// 'wifi'     Phone on the same Wi-Fi as the PC. Set PC_IP below (from
//            `ipconfig`) and allow port 3001 in Windows Firewall.
// 'emulator' Android emulator / iOS simulator on this PC.
// 'staging'  The shared staging server (no local backend needed).


// const BACKEND = 'usb'; // Local — testing real Razorpay against local backend (port 3001)
const BACKEND = 'staging'; //staging testing URL

const PC_IP = '192.168.1.27';
const LOCAL_PORT = 3001;

const BACKENDS = {
  usb: `https://epiphany-varmint-secret.ngrok-free.dev/`,
  wifi: `http://${PC_IP}:${LOCAL_PORT}`,
  emulator: `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${LOCAL_PORT}`,
  // staging: 'https://turag-staging.vercel.app',
  // staging: 'https://turag-testing.vercel.app',
  staging: 'https://turag.ai',
};

// Release builds normally always use staging (an installed app has no local
// backend). ⚠️ TESTING ONLY: RELEASE_USES_BACKEND = true makes a release build
// follow BACKEND too (e.g. the ngrok tunnel to the local backend), so OTP /
// Surepass / real Razorpay can be tested on a release build. Set it back to
// false before any build that leaves your hands.
const RELEASE_USES_BACKEND = false;
const ACTIVE_BACKEND = __DEV__ || RELEASE_USES_BACKEND ? BACKEND : 'staging';

// Trailing slashes are stripped so "…/api/v1" never becomes "…//api/v1".
export const BACKEND_URL = (BACKENDS[ACTIVE_BACKEND] ?? BACKENDS.staging).replace(/\/+$/, '');

export const API_BASE_URL = `${BACKEND_URL}/api/v1`;

// The public website: help, FAQ, contact and the legal pages (Privacy Policy,
// Terms, Refund Policy) open from here in the app - always the live site, even
// while testing against a local backend.
export const WEBSITE_URL = 'https://turag.ai';

// The support chat (the web's support widget): Turag's space on the Support
// Engine, shown inside the app. Signed-in users add a short-lived pass (?st=)
// so it can answer about their own bookings and offers.
export const SUPPORT_CHAT_URL = 'https://support-engine-pi.vercel.app/widget?k=turag';
export const SUPPORT_CHAT_ORIGIN = 'https://support-engine-pi.vercel.app';

// "Continue with Google" (as the web): Google sign-in runs through Turag's
// Supabase project, opened in a secure browser tab (Chrome Custom Tabs /
// Apple's sign-in sheet - Google refuses sign-in inside an app's web view).
// Supabase then sends the user back to the app on GOOGLE_REDIRECT_URL, which
// must be in the Supabase project's allowed redirect URLs. SUPABASE_URL is
// public (the website ships it too); '' hides the Google button.
export const SUPABASE_URL = 'https://rymrbhyyashvuzwhddcm.supabase.co';
export const GOOGLE_REDIRECT_URL = 'turag://auth/callback';

// The local backend runs in Next.js dev mode, which compiles each API route
// the first time it's called (10-20 s on a dev PC), so it gets more time.
const isLocalBackend = ACTIVE_BACKEND !== 'staging';

// Give up on a request after this long (slow networks still get a clear message).
export const REQUEST_TIMEOUT_MS = isLocalBackend ? 60000 : 20000;

// Photo / document uploads: the server processes the image inside the
// "complete" call, and the first upload after a quiet spell also pays the
// server's cold start, so the upload steps get longer than a normal request.
export const UPLOAD_TIMEOUT_MS = 60000;

// Which parts of the app talk to the real backend. Everything else still uses
// the mock data in src/api/mock until its backend is connected.
export const USE_REAL_API = {
  auth: true,
  notifications: true,
  marketplace: true, // Home grid, vehicle page, Saved, Make Offer
  valuation: true, // Evaluate flow, self-inspection uploads, Garage
  bookings: true, // My booking (details, cancel, inspector chat) + inspection report
  offers: true, // My offers (buyer), my listing's offers (seller), orders
  listings: true, // Selling: create a listing, My listings, submit / price / withdraw
  // Inspector app: jobs, start + capture + submit an M2 inspection. Uses the
  // valuation calls for the vehicle, answers, uploads and submit, so keep it
  // the same as `valuation`.
  inspector: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ DEV / TEST ONLY — direct OpenAI RC/VIN scan (mirrors the web's gpt-4o-mini
// extraction). Staging has no /identity-extract endpoint, so when this is on the
// app reads the VIN/RC photo by calling OpenAI DIRECTLY.
//
// The key SHIPS INSIDE THE APP — an installed APK can be decompiled and the key
// extracted. NEVER keep this enabled for a public production release; move the
// scan to a backend endpoint first. Approved for internal testing only.
// The key lives in src/api/secrets.js, which is git-ignored (never commit it -
// GitHub blocks pushes that contain it). No key = the scans fall back to the backend.
// ─────────────────────────────────────────────────────────────────────────────
import { OPENAI_API_KEY as LOCAL_OPENAI_KEY } from './secrets';

export const OPENAI_API_KEY = LOCAL_OPENAI_KEY;
export const DIRECT_OPENAI_SCAN = !!OPENAI_API_KEY;



