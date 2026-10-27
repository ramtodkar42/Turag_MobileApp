// Auth API: phone OTP sign-in, session refresh / logout.
// Real backend when USE_REAL_API.auth is true (src/api/config.js), mock otherwise.
import { request, readCookie } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapUser } from '../mappers/user';
import { mockRefresh, mockStartOtp, mockVerifyOtp } from '../mock/auth';

const REFRESH_COOKIE = 'tg_refresh';
const real = () => USE_REAL_API.auth;

// The app takes 10-digit Indian numbers; the backend wants E.164.
const toE164 = phone => `+91${phone}`;

// The backend returns the refresh token as a cookie today; prefer the body
// field when it starts sending one (planned for mobile clients).
const refreshTokenFrom = ({ data, headers }) =>
  data?.refresh_token ?? readCookie(headers, REFRESH_COOKIE);

// How the login code can be sent, in display order (as the web): ['whatsapp'],
// ['whatsapp', 'sms'] or ['sms']. [] when unknown (offline / mock) - the server
// then picks its default.
export const getOtpChannels = async () => {
  if (!real()) {
    return [];
  }
  try {
    const data = await request(ENDPOINTS.OTP_CHANNELS, { auth: false, timeoutMs: 8000 });
    return (data?.channels ?? []).filter(c => c === 'whatsapp' || c === 'sms');
  } catch {
    return [];
  }
};

// Step 1: send an OTP to the mobile number. channel: 'whatsapp' | 'sms', or
// omitted for the server's default (WhatsApp when it's available).
// Returns { otpToken, expiresIn, resendAfter, devHint? } (devHint: the code, dev servers only).
export const sendLoginOtp = async ({ phone, channel }) => {
  if (!real()) {
    return mockStartOtp({ phone });
  }
  const data = await request(ENDPOINTS.OTP_START, {
    method: 'POST',
    body: channel ? { phone: toE164(phone), channel } : { phone: toE164(phone) },
    auth: false,
  });
  return {
    otpToken: data.otp_token,
    expiresIn: data.expires_in,
    resendAfter: data.resend_after,
    devHint: data.dev_hint,
  };
};

// Step 2: check the OTP and open a session (creates the account for a new number).
// Returns { accessToken, refreshToken, expiresIn, user, consentRequired }.
// Continuing confirms the user is 18+ (shown on the Login screen).
export const verifyLoginOtp = async ({ phone, otpToken, otp }) => {
  if (!real()) {
    return mockVerifyOtp({ otpToken, otp });
  }
  const res = await request(ENDPOINTS.OTP_VERIFY, {
    method: 'POST',
    body: { otp_token: otpToken, code: otp, age_confirmed: true },
    auth: false,
    raw: true,
  });
  const refreshToken = refreshTokenFrom(res);
  if (!refreshToken) {
    throw new Error('Could not sign you in. Please try again.');
  }
  return {
    accessToken: res.data.access_token,
    refreshToken,
    expiresIn: res.data.expires_in,
    user: mapUser(res.data.user, { phone }),
    consentRequired: !!res.data.consent_required,
  };
};

// New access token (and rotated refresh token). Used by the session only.
export const refreshSession = async refreshToken => {
  if (!real()) {
    return mockRefresh(refreshToken);
  }
  const res = await request(ENDPOINTS.REFRESH, {
    method: 'POST',
    body: { refresh_token: refreshToken },
    auth: false,
    raw: true,
  });
  return {
    accessToken: res.data.access_token,
    refreshToken: refreshTokenFrom(res) ?? refreshToken,
    expiresIn: res.data.expires_in,
  };
};

// Ends the session on the server (signs this device out).
export const revokeSession = async refreshToken => {
  if (!real()) {
    return;
  }
  await request(ENDPOINTS.LOGOUT, {
    method: 'POST',
    body: { refresh_token: refreshToken },
    auth: false,
    timeoutMs: 5000,
  });
};
