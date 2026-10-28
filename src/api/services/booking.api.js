// Doorstep inspection bookings (the customer's side), as the web's /book and
// My inspections pages: slots + price, booking, paying the fee, the
// customer's bookings, cancel, chat with the inspector.
// The fee is paid to confirm the booking: a new booking is PENDING_PAYMENT
// (and not listed) until its fee is paid - then REQUESTED / ASSIGNED.
// Real backend when USE_REAL_API.bookings is true (src/api/config.js), mock otherwise.
import { ApiError, newIdempotencyKey, request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapBooking, mapBookingMessage, mapSlots } from '../mappers/booking';
import { sampleBookings, sampleMessages, sampleSlots } from '../mock/account';
import { savePaymentRef } from '../paymentRefs';
import { isTestGateway, openRazorpayCheckout } from '../razorpay';
import { openHostedCheckout } from '../hostedCheckout';
import { tNow } from '../../i18n';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.bookings;

// --- Booking a doorstep inspection ------------------------------------------

// Offered times and the price (public, no sign-in).
// Returns { price (₹ | null), enabled (false = booking switched off),
//   paymentsAvailable (false = no live payment gateway yet: can't book), days: [...] }.
export const getBookingSlots = async () => {
  if (!real()) {
    await wait(500);
    return mapSlots(sampleSlots());
  }
  return mapSlots(await request(ENDPOINTS.BOOKING_SLOTS, { auth: false }));
};

// Books the inspection. booking: {
//   category ('PASSENGER' | 'TWO_WHEELER'),
//   address ({ address, building?, landmark?, city? (the map's city name), pincode, geo? }),
//   slotAt (exact string from getBookingSlots), preparation ({ rcPresent, openSpace, keysAvailable }),
//   vehicleId?, valuationId?
// }. Returns the booking - PENDING_PAYMENT until payForBooking().
// Errors: 422 BOOKING_SLOT_UNAVAILABLE (time no longer offered), 503 BOOKING_UNAVAILABLE,
// CITY_NOT_SERVICEABLE (the address is in a city Turag doesn't serve yet).
export const createInspectionBooking = async ({
  category,
  address,
  slotAt,
  preparation = {},
  whatsappUpdates = false,
  vehicleId = null,
  valuationId = null,
}) => {
  const body = {
    category,
    mode: 'DOORSTEP',
    // As the web: the address, then the building / flat and landmark on their own.
    address_line: address.address.trim(),
    building: address.building?.trim() || null,
    landmark: address.landmark?.trim() || null,
    pincode: address.pincode,
    // The map's city name, as typed by the map (the web sends it raw too): the
    // server decides if it's served and stores its own city label.
    city: address.city || null,
    // The exact spot pinned on the map (optional, as the web).
    geo_lat: address.geo?.lat ?? null,
    geo_lng: address.geo?.lng ?? null,
    slot_at: slotAt,
    preparation: {
      rc_present: !!preparation.rcPresent,
      open_space: !!preparation.openSpace,
      keys_available: !!preparation.keysAvailable,
    },
    vehicle_id: vehicleId,
    valuation_id: valuationId,
    // DPDP inspection consent (as the web): the person agreed before booking.
    inspection_consent: true,
    // "Send me booking updates on WhatsApp": true opts in (service updates
    // only); false changes nothing - an earlier opt-in is never withdrawn here.
    whatsapp_updates: !!whatsappUpdates,
  };
  if (!real()) {
    await wait(900);
    const raw = {
      booking_id: `bkg_mock_${Date.now()}`,
      mode: body.mode,
      category,
      status: 'PENDING_PAYMENT',
      address_line: body.address_line,
      building: body.building,
      landmark: body.landmark,
      pincode: body.pincode,
      city: body.city,
      slot_at: slotAt,
      price: { amount_minor: 79900, currency: 'INR' },
      inspector_assigned: false,
      valuation_id: valuationId,
      inspection_id: null,
      fee_paid: false,
      created_at: new Date().toISOString(),
    };
    mockState().bookings.unshift(raw);
    return mapBooking(raw);
  }
  // The backend doesn't de-duplicate retries yet; the screen blocks double taps.
  const data = await request(ENDPOINTS.BOOKINGS, { method: 'POST', body, idempotent: true });
  return mapBooking(data.booking);
};

// --- Paying the booking fee -------------------------------------------------

// The Razorpay window and the test gateway: shared with the vehicle token (src/api/razorpay.js).
export { PAYMENT_CANCELLED, PAYMENT_UNAVAILABLE } from '../razorpay';

// The server webhook captures the payment; poll the booking until the fee shows
// paid. Returns the paid booking, or null if it hasn't confirmed in time (the
// webhook may be delayed or unreachable - the booking then stays PENDING_PAYMENT).
const waitForBookingPaid = async (bookingId, { tries = 12, delayMs = 2500 } = {}) => {
  for (let i = 0; i < tries; i += 1) {
    await wait(delayMs);
    const b = await getMyBooking(bookingId).catch(() => null);
    if (b?.feePaid) {
      return b;
    }
  }
  return null;
};

// Pays the doorstep inspection fee for a PENDING_PAYMENT booking (as the web's
// payForBooking): the payer picks UPI / card / net banking on the gateway's own
// page - PhonePe (the server's redirect_url, in a secure browser tab) or the
// Razorpay checkout; the test gateway (stub) completes via /pay/simulate. Then
// it polls until the webhook marks the fee paid. Safe to retry.
// opts: { amountMinor, label, prefill ({ name, email, contact }) } for Razorpay.
// Returns { paymentId, confirmed }.
export const payForBooking = async (bookingId, { amountMinor, label, prefill } = {}) => {
  if (!real()) {
    await wait(700);
    const raw = mockState().bookings.find(b => b.booking_id === bookingId);
    const paymentId = `pay_mock_${Date.now()}`;
    if (raw) {
      raw.status = 'ASSIGNED';
      raw.inspector_assigned = true;
      raw.fee_paid = true;
      raw.fee_paid_at = new Date().toISOString();
    }
    await savePaymentRef(bookingId, paymentId);
    return { paymentId, confirmed: true };
  }
  const { payment } = await request(ENDPOINTS.bookingPay(bookingId), {
    method: 'POST',
    body: {},
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
  await savePaymentRef(bookingId, payment.payment_id);
  if (payment.redirect_url) {
    // PhonePe (hosted checkout): its page, then wait for the webhook.
    await openHostedCheckout(payment.redirect_url);
    const paid = await waitForBookingPaid(bookingId);
    return { paymentId: payment.payment_id, confirmed: !!paid?.feePaid };
  }
  if (isTestGateway(payment)) {
    await request(ENDPOINTS.bookingPaySimulate(bookingId), { method: 'POST', body: {} });
    return { paymentId: payment.payment_id, confirmed: true };
  }
  // Real Razorpay (test or live key): open checkout, then wait for the webhook.
  await openRazorpayCheckout({
    keyId: payment.key_id,
    orderId: payment.provider_order_id,
    amountMinor: amountMinor ?? payment.amount_minor ?? null,
    description: label,
    prefill,
  });
  const paid = await waitForBookingPaid(bookingId);
  return { paymentId: payment.payment_id, confirmed: !!paid?.feePaid };
};

// --- The customer's own bookings --------------------------------------------

// MOCK state (raw backend shapes), created on first use.
let mock = null;
const mockState = () => {
  mock ??= { bookings: sampleBookings(), messages: { bkg_mock_1: sampleMessages() } };
  return mock;
};

const notFound = () =>
  new ApiError({ status: 404, code: 'BOOKING_NOT_FOUND', message: tNow('account.booking.notFound.message') });

// The signed-in customer's bookings, newest first.
export const getMyBookings = async () => {
  if (!real()) {
    await wait(500);
    // As the backend: unpaid bookings aren't listed.
    return mockState().bookings.filter(b => b.status !== 'PENDING_PAYMENT').map(mapBooking);
  }
  const data = await request(ENDPOINTS.BOOKINGS);
  return (data.bookings ?? []).map(mapBooking);
};

// One booking. The backend has no single-booking endpoint (the web does the
// same): load the list and pick it. Throws 404 BOOKING_NOT_FOUND.
export const getMyBooking = async bookingId => {
  const booking = (await getMyBookings()).find(b => b.id === bookingId);
  if (!booking) {
    throw notFound();
  }
  return booking;
};

// Cancels a booking (allowed while REQUESTED / ASSIGNED). Returns the booking.
export const cancelMyBooking = async bookingId => {
  if (!real()) {
    await wait(600);
    const raw = mockState().bookings.find(b => b.booking_id === bookingId);
    if (!raw) {
      throw notFound();
    }
    raw.status = 'CANCELLED';
    return mapBooking(raw);
  }
  const data = await request(ENDPOINTS.bookingCancel(bookingId), { method: 'POST' });
  return mapBooking(data.booking);
};

// Chat with the inspector, oldest first.
export const getBookingMessages = async bookingId => {
  if (!real()) {
    await wait(300);
    return (mockState().messages[bookingId] ?? []).map(mapBookingMessage);
  }
  const data = await request(ENDPOINTS.bookingMessages(bookingId));
  return (data.messages ?? []).map(mapBookingMessage);
};

// Sends one chat message (1-2000 characters). Returns the saved message.
export const sendBookingMessage = async (bookingId, text) => {
  const body = text.trim();
  if (!real()) {
    await wait(400);
    const raw = {
      message_id: `msg_mock_${Date.now()}`,
      body,
      sender_is_me: true,
      created_at: new Date().toISOString(),
    };
    const state = mockState();
    state.messages[bookingId] = [...(state.messages[bookingId] ?? []), raw];
    return mapBookingMessage(raw);
  }
  const data = await request(ENDPOINTS.bookingMessages(bookingId), { method: 'POST', body: { body } });
  return mapBookingMessage(data.message);
};

// Tests only.
export const resetMockBookings = () => {
  mock = null;
};
