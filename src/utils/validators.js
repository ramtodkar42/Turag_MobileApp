import { tNow } from '../i18n';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^(\+91)?[6-9]\d{9}$/; // Indian mobile, optional +91

// Indian registration number: state (2 letters) + RTO (1-2 digits) + series (0-3 letters) + 4 digits.
// e.g. MH12CT4590, MH 12 DX 5087, DL3C1234
const REG_NUMBER = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{4})$/;

// Keeps letters/digits only, uppercased: "mh 12-ct 4590" -> "MH12CT4590"
export const normalizeRegNumber = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isValidRegNumber = value => REG_NUMBER.test(normalizeRegNumber(value));

// "MH12DX5087" -> "MH 12 DX 5087" (for display)
export const formatRegNumber = value => {
  const parts = normalizeRegNumber(value).match(REG_NUMBER);
  return parts ? parts.slice(1).filter(Boolean).join(' ') : value;
};

export const isEmail = value => EMAIL.test(value.trim());
export const isPhone = value => PHONE.test(value.replace(/[\s-]/g, ''));

// Read when used, so it is in the current language.
export const phoneError = () => tNow('errors.phone');

// Message for a mobile-number field, shown only once all 10 digits are typed
// (so the user isn't told off while still typing). '' when there's no problem.
export const getPhoneError = value => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 && !isPhone(digits) ? phoneError() : '';
};

// New-user details. Returns { field: message } for every invalid field; {} when valid.
export const validateProfile = ({ fullName, email }) => {
  const errors = {};
  if (fullName.trim().length < 2) {
    errors.fullName = tNow('errors.fullName');
  }
  if (!isEmail(email)) {
    errors.email = tNow('errors.email');
  }
  return errors;
};

// Create Account: name + verified email + "What brings you" (needsProfile) and
// the required consents (needsConsent). Both default to true (a new account).
export const validateAccount = ({
  fullName,
  email,
  emailVerified,
  purpose,
  consents,
  needsProfile = true,
  needsConsent = true,
}) => {
  const errors = {};
  if (needsProfile) {
    Object.assign(errors, validateProfile({ fullName, email }));
    if (!errors.email && !emailVerified) {
      errors.email = tNow('errors.verifyEmail');
    }
    if (!purpose) {
      errors.purpose = tNow('errors.choosePurpose');
    }
  }
  if (needsConsent && (!consents.terms || !consents.privacy)) {
    errors.consents = tNow('errors.consents');
  }
  return errors;
};
