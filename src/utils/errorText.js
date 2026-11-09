import { tNow } from '../i18n';

// A backend error in the user's language, as the web shows it: the app's own
// words for the error codes in `keys` ({ CODE: 'i18n.key' }), otherwise the
// error's message (the app's own for network problems, the server's for the
// rest), otherwise `fallbackKey`.
export const errorText = (e, keys, fallbackKey) => {
  const key = e?.code ? keys[e.code] : null;
  if (key) {
    return tNow(key);
  }
  return e?.message || tNow(fallbackKey);
};

// Signing in with a code (send / check / resend), as the web's sign-in sheet.
export const OTP_ERROR_KEYS = {
  AUTH_OTP_INVALID: 'auth.err.otpInvalid',
  AUTH_OTP_EXPIRED: 'auth.err.otpExpired',
  AUTH_OTP_RATE_LIMITED: 'auth.err.otpRateLimited',
  AGE_RESTRICTED: 'auth.err.ageRestricted',
  VALIDATION_ERROR: 'auth.err.validation',
  SERVICE_UNAVAILABLE: 'auth.err.unavailable',
};

// Making an offer, as the web's vehicle page. (ELIGIBILITY_BLOCKED keeps the
// server's reason when it gives one - see useOfferForm.)
export const OFFER_ERROR_KEYS = {
  ELIGIBILITY_BLOCKED: 'marketplace.offer.err.ineligible',
  OWN_LISTING: 'marketplace.offer.err.own',
  OFFER_ALREADY_ACTIVE: 'marketplace.offer.err.active',
  LISTING_NOT_AVAILABLE: 'marketplace.offer.err.unavailable',
  MARKETPLACE_UNAVAILABLE: 'marketplace.offer.err.marketplace',
  VALIDATION_ERROR: 'marketplace.offer.err.validation',
};
