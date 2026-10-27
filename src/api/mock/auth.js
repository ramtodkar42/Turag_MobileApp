// MOCK auth + account, used when USE_REAL_API.auth is false (no backend running).
// Same return shapes as the real services in auth.api.js / profile.api.js.
import { ROLES } from '../../constants/roles';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// This number is an inspection officer; other numbers ending in 0 are new users.
const MOCK_INSPECTOR_PHONE = '9890871972';

let mockUser = null;
let mockConsents = false;

const userFor = phone => {
  if (phone === MOCK_INSPECTOR_PHONE) {
    return { fullName: 'Inspector Officer', roles: ['inspector'], role: ROLES.INSPECTOR };
  }
  if (phone.endsWith('0')) {
    return { fullName: '', roles: ['consumer'], role: ROLES.INDIVIDUAL };
  }
  return { fullName: 'Turag User', roles: ['consumer'], role: ROLES.INDIVIDUAL };
};

export const mockStartOtp = async ({ phone }) => {
  await wait(600);
  return { otpToken: `mock:${phone}`, expiresIn: 300, resendAfter: 59, devHint: undefined };
};

export const mockVerifyOtp = async ({ otpToken, otp }) => {
  await wait(600);
  if (otp.length !== 6) {
    throw new Error('Invalid OTP. Please try again.');
  }
  const phone = otpToken.replace('mock:', '');
  mockUser = {
    id: `usr_mock_${phone}`,
    contact: phone,
    email: '',
    emailVerified: false,
    ...userFor(phone),
  };
  mockConsents = !!mockUser.fullName;
  return {
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
    expiresIn: 900,
    user: mockUser,
    consentRequired: !mockConsents,
  };
};

export const mockRefresh = async refreshToken => {
  await wait(200);
  return { accessToken: 'mock-access', refreshToken, expiresIn: 900 };
};

export const mockGetMe = async () => {
  await wait(300);
  return { user: mockUser, consents: [], memberSince: null };
};

export const mockUpdateName = async name => {
  await wait(400);
  mockUser = { ...mockUser, fullName: name };
  return mockUser;
};

export const mockAcceptConsents = async () => {
  await wait(400);
  mockConsents = true;
  return [];
};

export const mockSaveEmail = async email => {
  await wait(400);
  mockUser = { ...mockUser, email };
  return { sent: false };
};
