// Profile / account API: the signed-in user (GET /me), name, email and consents.
// Real backend when USE_REAL_API.auth is true (src/api/config.js), mock otherwise.
import { request } from '../client';
import { API_BASE_URL, UPLOAD_TIMEOUT_MS, USE_REAL_API } from '../config';
import { getAccessToken } from '../session';
import { ENDPOINTS } from '../endpoints';
import { mapConsents, mapUser } from '../mappers/user';
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

// Personal Information: { mobile, accountId, languages, consents }.
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
        { key: 'MARKETING', label: 'Marketing', verified: true },
      ],
    };
  }
  const data = await request(ENDPOINTS.ME);
  return {
    mobile: data.user.phone_masked,
    accountId: data.user.id,
    languages: LANGUAGES,
    consents: withMarketing(mapConsents(data.consents_summary)),
  };
};

// Marketing is optional, so an account may have no MARKETING record at all
// (never asked, or skipped at sign-up): show it as off (as the web's Account page).
const withMarketing = consents =>
  consents.some(c => c.key === 'MARKETING')
    ? consents
    : [...consents, { key: 'MARKETING', label: 'Marketing', verified: false }];

// The Marketing on / off switch: records just that choice (never Terms /
// Privacy again, as the web). Returns the updated consents.
export const setMarketingConsent = async granted => {
  if (!real()) {
    return [
      { key: 'terms', label: 'Account Terms', verified: true },
      { key: 'privacy', label: 'Privacy Policy', verified: true },
      { key: 'MARKETING', label: 'Marketing', verified: granted },
    ];
  }
  const data = await request(ENDPOINTS.CONSENTS, { method: 'POST', body: { marketing: granted } });
  return withMarketing(mapConsents(data.consents_summary));
};

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

// The account's photo for an <Image>: the route needs the login, so the
// token goes in the request headers; avatarUrl in the address makes a new
// photo load fresh instead of the cached old one. null when there is none.
export const avatarImageSource = async avatarUrl => {
  if (!avatarUrl) {
    return null;
  }
  if (!real()) {
    return { uri: avatarUrl };
  }
  const token = await getAccessToken();
  if (!token) {
    return null;
  }
  return {
    uri: `${API_BASE_URL}${ENDPOINTS.MY_AVATAR}?v=${encodeURIComponent(avatarUrl)}`,
    headers: { Authorization: `Bearer ${token}` },
  };
};

// Sets the display name; returns the updated user.
export const updateMyName = async (name, { phone } = {}) => {
  if (!real()) {
    return mockUpdateName(name);
  }
  const data = await request(ENDPOINTS.ME, { method: 'PATCH', body: { name } });
  return mapUser(data.user, { phone });
};

// Terms + Privacy are required for an account; marketing is optional.
export const acceptConsents = async ({ terms, privacy, marketing }) => {
  if (!real()) {
    return mockAcceptConsents();
  }
  const data = await request(ENDPOINTS.CONSENTS, {
    method: 'POST',
    body: { accept_terms: terms, accept_privacy: privacy, marketing },
  });
  return mapConsents(data.consents_summary);
};

// Saves the email on the account (the backend also emails a verification link).
export const saveMyEmail = async email => {
  if (!real()) {
    return mockSaveEmail(email);
  }
  const data = await request(ENDPOINTS.EMAIL_START, { method: 'POST', body: { email } });
  return { sent: !!data.sent };
};
