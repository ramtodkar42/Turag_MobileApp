import { ApiError } from './client';
import { tNow } from '../i18n';

// The Razorpay checkout window, shared by the inspection fee and the vehicle
// token (as the web's lib/razorpay-checkout). Opening it never confirms a
// payment: the verified server webhook does, and the caller then checks.

export const PAYMENT_UNAVAILABLE = 'PAYMENT_UNAVAILABLE';
export const PAYMENT_CANCELLED = 'PAYMENT_CANCELLED';

// The test gateway (staging / dev) has no checkout window: its payment is
// completed with the backend's /simulate route, as the web does there.
const STUB_KEY_ID = 'rzp_test_stub';
export const isTestGateway = payment =>
  String(payment?.key_id ?? '').includes('stub') ||
  String(payment?.provider_order_id ?? '').startsWith('order_stub') ||
  payment?.key_id === STUB_KEY_ID;

// The SDK's own error codes (Checkout.PAYMENT_CANCELED / NETWORK_ERROR).
const SDK_CANCELLED = 0;
const SDK_NETWORK_ERROR = 2;

// Razorpay's error `description` is sometimes a sentence and sometimes a JSON
// string ({"error":{"code","description","source","step","reason"}}) - never
// shown as it is. Returns that inner error, or null.
const gatewayError = description => {
  try {
    return JSON.parse(description)?.error ?? null;
  } catch {
    return null;
  }
};

// Why the checkout ended:
//   cancelled - the payer closed it / backed out
//   network   - the payment page couldn't be reached
//   declined  - the bank / UPI app didn't approve it (e.g. reason payment_error
//               at payment_authentication) - any money taken comes back by itself
export const checkoutErrorKind = e => {
  const reason = gatewayError(e?.description)?.reason;
  if (e?.code === SDK_NETWORK_ERROR) {
    return 'network';
  }
  if (reason === 'payment_cancelled' || (e?.code === SDK_CANCELLED && !reason)) {
    return 'cancelled';
  }
  return 'declined';
};

const KIND_MESSAGES = {
  cancelled: 'booking.summary.payCancelled',
  network: 'booking.summary.payNetwork',
  declined: 'booking.summary.payFailed',
};

// The same, in plain words in the app language.
export const checkoutErrorMessage = e => tNow(KIND_MESSAGES[checkoutErrorKind(e)]);

// Any failed payment as the PaymentNotice card shows it: { kind ('cancelled' |
// 'declined' | 'network' | 'unavailable' | 'failed'), message, messageKey? }
// (the key lets the card follow a language switch). Errors that aren't from
// the payment window get the general "didn't go through".
export const paymentProblem = e => {
  if (e?.code === PAYMENT_CANCELLED) {
    return { kind: e.details?.kind ?? 'cancelled', message: e.message, messageKey: e.details?.messageKey };
  }
  if (e?.code === PAYMENT_UNAVAILABLE || e?.code === 'PAYMENTS_UNAVAILABLE') {
    return { kind: 'unavailable', message: e.message };
  }
  return { kind: 'failed', message: tNow('booking.summary.payError'), messageKey: 'booking.summary.payError' };
};

// Opens the checkout for a server-made order. The native SDK is loaded on first
// use, so a build without it says "payment unavailable" instead of crashing.
// Rejects PAYMENT_CANCELLED if the payer closes the window or it fails, with
// a readable message (checkoutErrorMessage).
// Razorpay shows every way to pay (UPI, card, net banking...), as on the web.
// prefill: { name, email, contact }.
export const openRazorpayCheckout = async ({
  keyId,
  orderId,
  amountMinor,
  description,
  prefill,
}) => {
  let RazorpayCheckout;
  try {
    RazorpayCheckout = require('react-native-razorpay').default;
  } catch {
    throw new ApiError({
      code: PAYMENT_UNAVAILABLE,
      message: tNow('booking.summary.payUnavailable'),
    });
  }
  try {
    await RazorpayCheckout.open({
      key: keyId,
      order_id: orderId,
      amount: amountMinor ?? undefined,
      currency: 'INR',
      name: 'Turag',
      description: description || tNow('booking.summary.payDescription'),
      prefill: prefill ?? {},
      theme: { color: '#E82127' },
    });
  } catch (e) {
    throw new ApiError({
      code: PAYMENT_CANCELLED,
      message: checkoutErrorMessage(e),
      details: { kind: checkoutErrorKind(e), messageKey: KIND_MESSAGES[checkoutErrorKind(e)] },
    });
  }
};
