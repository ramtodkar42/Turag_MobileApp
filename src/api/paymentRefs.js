import { readPref, writePref } from '../utils/appPrefs';

// The payment reference (pay_...) of a booking's fee, for its receipt. The
// booking itself doesn't carry it, so it's kept on this phone when the app
// pays (the receipt leaves the row out when it isn't known).
const key = bookingId => `receipt.payment.${bookingId}`;

export const savePaymentRef = (bookingId, paymentId) =>
  paymentId ? writePref(key(bookingId), paymentId) : Promise.resolve();

export const loadPaymentRef = bookingId => readPref(key(bookingId));
