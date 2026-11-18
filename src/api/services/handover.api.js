import { ApiError, request } from '../client';
import { BACKEND_URL } from '../config';
import { ENDPOINTS } from '../endpoints';
import { toRupees } from '../mappers/money';
import { mapOrder } from '../mappers/offer';
import { tNow } from '../../i18n';

// Buyer-confirmed handover by QR (the web's ADR-0097). The seller starts it and shows
// a QR (and a 6-character backup code); the buyer scans it, or types the code on
// their order page, checks the vehicle, keys and documents and confirms, or reports
// a problem to Turag. Only the buyer can finish it: the seller can't close a sale alone.

// A handover key: what the buyer answers with. { token } from the scanned QR, or
// { orderId, shortCode } typed on the order page.
const keyBody = key =>
  key.token ? { token: key.token } : { order_id: key.orderId, short_code: String(key.shortCode).trim().toUpperCase() };

// The link inside the seller's QR (as the web): a phone camera outside the app opens
// the web page; the app's own scanner reads the token from it. The token is after
// "#", so browsers never send it to a server.
export const handoverQrValue = token => `${BACKEND_URL}/handover#t=${token}`;

// The token from a scanned QR, or null when it isn't a Turag handover code.
export const handoverTokenFromQr = text => {
  const match = String(text ?? '').match(/\/handover\/?#t=([A-Za-z0-9_-]{20,100})$/);
  return match ? match[1] : null;
};

// The backup code as typed: 6 letters / digits (the server's never use 0, O, 1 or I,
// but they're accepted here and checked by the server).
export const HANDOVER_CODE_LENGTH = 6;
export const cleanHandoverCode = text =>
  String(text ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, HANDOVER_CODE_LENGTH);

// The server's handover refusals in the app's words (its own are English only).
// "That code is not right. 3 tries left." -> the count, or none when locked.
const triesLeft = message => {
  const match = String(message ?? '').match(/(\d+)\s+tr(?:y|ies)\s+left/i);
  return match ? Number(match[1]) : 0;
};
// buyer: the buyer's own calls ("not found" there means no live code for them).
const friendly = (e, buyer) => {
  if (!(e instanceof ApiError)) return e;
  let message = null;
  if (e.code === 'HANDOVER_CODE_INVALID') {
    const left = triesLeft(e.message);
    message = left > 0 ? tNow('handover.err.wrongCode', { count: left }) : tNow('handover.err.locked');
  } else if (e.code === 'HANDOVER_CODE_EXPIRED') {
    message = tNow('handover.err.expired');
  } else if (e.code === 'HANDOVER_CHECKLIST_INCOMPLETE') {
    message = tNow('handover.err.checklist');
  } else if (buyer && (e.code === 'ORDER_NOT_FOUND' || e.status === 404)) {
    message = tNow('handover.buyer.noCode');
  } else if (e.code === 'TRANSFER_NOT_INITIATED') {
    message = tNow('selling.handover.needForms');
  }
  return message ? new ApiError({ status: e.status, code: e.code, message }) : e;
};
const call = async (path, body, { buyer = true } = {}) => {
  try {
    return await request(path, { method: 'POST', body });
  } catch (e) {
    throw friendly(e, buyer);
  }
};

// The seller: a new single-use handover (10 minutes; starting again replaces the last
// one). Allowed once the transfer forms are in. Returns { token, shortCode, expiresAt (ms) }.
export const startHandover = async orderId => {
  const { handover } = await call(ENDPOINTS.orderHandoverStart(orderId), {}, { buyer: false });
  return { token: handover.token, shortCode: handover.short_code, expiresAt: Date.parse(handover.expires_at) };
};

// The buyer: which order a key is for, before confirming. Returns
// { orderId, vehicle: { make, model, year } | null, agreedPrice (₹), expiresAt (ms) }.
export const previewHandover = async key => {
  const { preview } = await call(ENDPOINTS.HANDOVER_PREVIEW, keyBody(key));
  return {
    orderId: preview.order_id,
    vehicle: preview.vehicle
      ? { make: preview.vehicle.make, model: preview.vehicle.model, year: preview.vehicle.mfg_year }
      : null,
    agreedPrice: toRupees(preview.agreed_price),
    expiresAt: Date.parse(preview.expires_at),
  };
};

// The buyer confirms they have the vehicle, the keys and the original RC + documents
// (all three must be true). Returns the handed-over order.
export const confirmHandover = async (key, { vehicle, keys, documents }) => {
  const { order } = await call(ENDPOINTS.HANDOVER_CONFIRM, {
    ...keyBody(key),
    checklist: { vehicle: !!vehicle, keys: !!keys, documents: !!documents },
  });
  return mapOrder(order);
};

// The buyer reports a problem instead: nothing is handed over, Turag's team is told
// and the seller isn't paid until it's sorted out.
export const refuseHandover = async (key, reason) => {
  await call(ENDPOINTS.HANDOVER_REFUSE, { ...keyBody(key), reason: String(reason).trim() });
};
