// Profile / account API: the signed-in user (GET /me), name, email and consents.
// Real backend when USE_REAL_API.auth is true (src/api/config.js), mock otherwise.
import { request } from '../client';
import { USE_REAL_API } from '../config';
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
        { key: 'marketing', label: 'Marketing', verified: true },
      ],
    };
  }
  const data = await request(ENDPOINTS.ME);
  return {
    mobile: data.user.phone_masked,
    accountId: data.user.id,
    languages: LANGUAGES,
    consents: mapConsents(data.consents_summary),
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
