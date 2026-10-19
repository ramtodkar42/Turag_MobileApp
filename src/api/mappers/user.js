import { ROLES } from '../../constants/roles';

// Backend role names -> the app's role (which home the user gets).
const isInspector = roles => roles.includes('inspector');

// Backend user (GET /me, OTP verify) -> the user shape screens use (userStore).
// `phone`: the 10-digit number the user typed, shown instead of the masked one.
export const mapUser = (apiUser, { phone } = {}) => {
  const roles = apiUser?.roles ?? [];
  return {
    id: apiUser?.id,
    fullName: apiUser?.name ?? '',
    contact: phone ?? apiUser?.phone_masked ?? '',
    email: apiUser?.email ?? '',
    emailVerified: !!apiUser?.email_verified,
    roles,
    role: isInspector(roles) ? ROLES.INSPECTOR : ROLES.INDIVIDUAL,
  };
};

const CONSENT_LABELS = {
  ACCOUNT_TERMS: 'Account Terms',
  PRIVACY_POLICY: 'Privacy Policy',
  MARKETING: 'Marketing',
};

// consents_summary -> [{ key, label, verified }] for Personal Information.
export const mapConsents = (summary = []) =>
  summary.map(item => ({
    key: item.purpose,
    label: CONSENT_LABELS[item.purpose] ?? item.purpose,
    verified: !!item.granted,
  }));
