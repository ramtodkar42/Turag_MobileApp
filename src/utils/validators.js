import { tNow } from '../i18n';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^(\+91)?[6-9]\d{9}$/; // Indian mobile, optional +91

// Indian registration numbers, exactly as the backend accepts them
// (vehicle-registry registration-number.ts):
// - standard: state (2 letters) + RTO (1-2 digits) + series (1-3 letters) + 4 digits,
//   e.g. MH12CT4590, MH 12 DX 5087, DL3C1234, DL10CAB1234
// - Bharat (BH) series: year (2 digits) + BH + 4 digits + 1-2 letters, e.g. 22BH1234AA
const STANDARD = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/;
const BH_SERIES = /^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/;

// The longest valid number, typed without spaces (DL10CAB1234).
export const REG_NUMBER_MAX_LENGTH = 11;

// Keeps letters/digits only, uppercased: "mh 12-ct 4590" -> "MH12CT4590"
export const normalizeRegNumber = value => String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const regParts = value => {
  const plate = normalizeRegNumber(value);
  return plate.match(STANDARD) ?? plate.match(BH_SERIES);
};

export const isValidRegNumber = value => !!regParts(value);

// "MH12DX5087" -> "MH 12 DX 5087", "22BH1234AA" -> "22 BH 1234 AA" (for display)
export const formatRegNumber = value => {
  const parts = regParts(value);
  return parts ? parts.slice(1).join(' ') : value;
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

// Create Account: name + email + "What brings you" (needsProfile) and
// the required consents (needsConsent). Both default to true (a new account).
export const validateAccount = ({
  fullName,
  email,
  purpose,
  consents,
  needsProfile = true,
  needsConsent = true,
}) => {
  const errors = {};
  if (needsProfile) {
    Object.assign(errors, validateProfile({ fullName, email }));
    if (!purpose) {
      errors.purpose = tNow('errors.choosePurpose');
    }
  }
  if (needsConsent && (!consents.terms || !consents.privacy)) {
    errors.consents = tNow('errors.consents');
  }
  return errors;
};
