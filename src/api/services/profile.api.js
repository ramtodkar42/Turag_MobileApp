// Profile / account API: the signed-in user (GET /me), name, email and consents.
// Real backend when USE_REAL_API.auth is true (src/api/config.js), mock otherwise.
import { request } from '../client';
import { API_BASE_URL, UPLOAD_TIMEOUT_MS, USE_REAL_API } from '../config';
import { getAccessToken, refreshAccessToken } from '../session';
import { ENDPOINTS } from '../endpoints';
import { CONSENT_LABELS, mapConsents, mapUser } from '../mappers/user';
import {
  mockAcceptConsents,
  mockGetMe,
  mockSaveEmail,
  mockUpdateName,
} from '../mock/auth';

const real = () => USE_REAL_API.auth;

// Languages aren't stored by the backend yet.
const LANGUAGES = ['English', 'Marathi', 'Hindi'];

// { user, consents, memberSince }. `phone`: the number typed at login, shown
// instead of the masked one the backend returns.
export const getMe = async ({ phone } = {}) => {
  if (!real()) {
    return mockGetMe();
  }
  const data = await request(ENDPOINTS.ME);
  return {
    user: mapUser(data.user, { phone }),
    consents: mapConsents(data.consents_summary),
    memberSince: data.member_since,
  };
};

// Personal Information: { mobile, accountId, email, emailVerified, languages, consents }.
// emailVerified turns true only once the user taps the link Turag emailed.
export const getProfile = async () => {
  if (!real()) {
    await mockGetMe();
    return {
      mobile: '+91 94757 74739',
      accountId: 'TRG57488832',
      languages: LANGUAGES,
      consents: [
        { key: 'terms', label: 'Account Terms', verified: true },
        { key: 'privacy', label: 'Privacy Policy', verified: true },
        { key: 'MARKETING', label: 'Offers and updates', verified: true },
      ],
    };
  }
  const data = await request(ENDPOINTS.ME);
  return {
    mobile: data.user.phone_masked,
    accountId: data.user.id,
    email: data.user.email ?? '',
    emailVerified: !!data.user.email_verified,
    languages: LANGUAGES,
    consents: withOptional(mapConsents(data.consents_summary)),
  };
};

// The consents a user can switch on / off (never Terms / Privacy, which hold
// the account), with the field POST /consents takes for each (as the web).
export const OPTIONAL_CONSENTS = { MARKETING: 'marketing', WHATSAPP: 'whatsapp' };

// The optional ones may have no record at all (never asked, or skipped at
// sign-up): show them as off (as the web's Account page).
const withOptional = consents => {
  const all = [...consents];
  for (const key of Object.keys(OPTIONAL_CONSENTS)) {
    if (!all.some(c => c.key === key)) {
      all.push({ key, label: CONSENT_LABELS[key], verified: false });
    }
  }
  return all;
};

// An optional consent's on / off switch (key: 'MARKETING' | 'WHATSAPP'):
// records just that choice. Returns the updated consents.
export const setOptionalConsent = async (key, granted) => {
  if (!real()) {
    return [
      { key: 'terms', label: 'Account Terms', verified: true },
      { key: 'privacy', label: 'Privacy Policy', verified: true },
      { key: 'MARKETING', label: 'Offers and updates', verified: key === 'MARKETING' ? granted : true },
    ];
  }
  const data = await request(ENDPOINTS.CONSENTS, { method: 'POST', body: { [OPTIONAL_CONSENTS[key]]: granted } });
  return withOptional(mapConsents(data.consents_summary));
};

export const setMarketingConsent = granted => setOptionalConsent('MARKETING', granted);

// Profile photo (as the web's Account page): a small square JPEG, saved on the
// account so it shows on every phone and on the web. file: from
// pickProfilePhoto. Returns the updated user (with its new avatarUrl).
export const uploadMyAvatar = async (file, { phone } = {}) => {
  if (!real()) {
    const { user } = await mockGetMe();
    return { ...user, avatarUrl: file.uri };
  }
  const uri = file.uri.startsWith('/') ? `file://${file.uri}` : file.uri;
  const blob = await (await fetch(uri)).blob();
  const data = await request(ENDPOINTS.MY_AVATAR, {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return mapUser(data.user, { phone });
};

// The account's photo as a local file, by its avatarUrl (each new photo has a
// new one): a photo just saved from this phone, or one downloaded before.
const avatarFiles = new Map();

// A photo just saved from this phone shows at once from the picked file.
export const rememberAvatarFile = (avatarUrl, uri) => {
  if (avatarUrl && uri) {
    avatarFiles.set(avatarUrl, uri);
  }
};

const avatarVersion = avatarUrl => {
  const match = /[?&]v=([^&]+)/.exec(avatarUrl);
  return (match ? decodeURIComponent(match[1]) : avatarUrl).replace(/[^\w.-]+/g, '_').slice(-80);
};

// The account's photo for an <Image>, or null when there is none / it can't
// be loaded (the Avatar then shows initials). GET /me/avatar needs the login,
// and an image view sending that token itself isn't reliable on every phone -
// so it's downloaded here with the token (refreshed once if it just expired)
// into the phone's cache and shown from there. Kept per photo version, so it
// opens instantly next time and offline.
export const avatarImageSource = async avatarUrl => {
  if (!avatarUrl) {
    return null;
  }
  if (!real()) {
    return { uri: avatarUrl };
  }
  const known = avatarFiles.get(avatarUrl);
  if (known) {
    return { uri: known };
  }
  const url = `${API_BASE_URL}${ENDPOINTS.MY_AVATAR}?v=${encodeURIComponent(avatarVersion(avatarUrl))}`;
  let BlobUtil = null;
  try {
    BlobUtil = require('react-native-blob-util').default;
  } catch {
    BlobUtil = null;
  }
  if (!BlobUtil?.fs?.dirs?.CacheDir) {
    // No file download on this build: let the image view send the token.
    const token = await getAccessToken();
    return token ? { uri: url, headers: { Authorization: `Bearer ${token}` } } : null;
  }

  const path = `${BlobUtil.fs.dirs.CacheDir}/turag-avatar-${avatarVersion(avatarUrl)}.jpg`;
  const fileUri = `file://${path}`;
  if (await BlobUtil.fs.exists(path).catch(() => false)) {
    avatarFiles.set(avatarUrl, fileUri);
    return { uri: fileUri };
  }
  const download = token => BlobUtil.config({ path, overwrite: true }).fetch('GET', url, { Authorization: `Bearer ${token}` });
  try {
    let res = await download(await getAccessToken());
    if (res.info().status === 401) {
      res = await download(await refreshAccessToken());
    }
    if (res.info().status !== 200) {
      BlobUtil.fs.unlink(path).catch(() => {});
      return null;
    }
  } catch {
    BlobUtil.fs.unlink(path).catch(() => {});
    return null;
  }
  avatarFiles.set(avatarUrl, fileUri);
  return { uri: fileUri };
};

// Sets the display name; returns the updated user.
export const updateMyName = async (name, { phone } = {}) => {
  if (!real()) {
    return mockUpdateName(name);
  }
  const data = await request(ENDPOINTS.ME, { method: 'PATCH', body: { name } });
  return mapUser(data.user, { phone });
};

// Terms + Privacy are required for an account; marketing and WhatsApp updates
// are optional (WhatsApp is only sent when ticked, as the web).
export const acceptConsents = async ({ terms, privacy, marketing, whatsapp }) => {
  if (!real()) {
    return mockAcceptConsents();
  }
  const data = await request(ENDPOINTS.CONSENTS, {
    method: 'POST',
    body: { accept_terms: terms, accept_privacy: privacy, marketing, ...(whatsapp ? { whatsapp: true } : {}) },
  });
  return mapConsents(data.consents_summary);
};

// Signed up as a dealer or a bank / NBFC ("What brings you to Turag?", as the
// web): tells Turag's team to reach out (and sends a WhatsApp welcome when
// WhatsApp updates are on). Changes no roles - business accounts are given only
// after Turag verifies the organisation. kind: 'DEALER' | 'BANK'.
export const registerBusinessInterest = async kind => {
  if (!real()) {
    return { whatsappQueued: false };
  }
  const data = await request(ENDPOINTS.BUSINESS_INTEREST, { method: 'POST', body: { kind } });
  return { whatsappQueued: !!data?.whatsapp_queued };
};

// Saves the email on the account, unverified, and emails a verification link
// (as the web). Also "Resend link" for the email already there. Errors:
// EMAIL_IN_USE (another account has it), EMAIL_DELIVERY_UNAVAILABLE (mail down).
export const saveMyEmail = async email => {
  if (!real()) {
    return mockSaveEmail(email);
  }
  const data = await request(ENDPOINTS.EMAIL_START, { method: 'POST', body: { email } });
  return { sent: !!data.sent };
};
