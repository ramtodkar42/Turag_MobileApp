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

// Opens the checkout for a server-made order. The native SDK is loaded on first
// use, so a build without it says "payment unavailable" instead of crashing.
// Rejects PAYMENT_CANCELLED if the payer closes the window or it fails.
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
      message: e?.description || tNow('booking.summary.payError'),
    });
  }
};
