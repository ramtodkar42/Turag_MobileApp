// Offers + orders API - needs sign-in.
// - Making an offer on a marketplace vehicle: USE_REAL_API.marketplace.
// - The buyer's offers (My offers), answering offers on the seller's own
//   listing, and orders: USE_REAL_API.offers.
// Real backend when the flag is true (src/api/config.js), mock otherwise.
//
// Offer life: PENDING -> (seller) COUNTERED -> (buyer) PENDING ... ->
// ACCEPTED (creates an order) | DECLINED | WITHDRAWN | EXPIRED.
// After any counter, the offer's `amount` is that counter.
import { ApiError, request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { toMoney } from '../mappers/money';
import { mapOffer, mapOrder } from '../mappers/offer';
import { sampleBuyerOffers, sampleListingOffers, sampleOrders } from '../mock/account';
import { tNow } from '../../i18n';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const realMarket = () => USE_REAL_API.marketplace;
const real = () => USE_REAL_API.offers;

// offer: { vehicleId, price (rupees), message, idempotencyKey }
// `idempotencyKey`: the same key for every retry of one offer, so a retry after
// a network error can't create a second offer.
// `message`: kept in the form; the backend has no field for it yet, so it is
// not sent.
// Returns { offerId, status, amount (rupees), expiresAt }.
export const submitOffer = async ({ vehicleId, price, idempotencyKey }) => {
  if (!realMarket()) {
    await wait(800);
    return { offerId: `OF${Date.now()}`, status: 'PENDING', amount: price, expiresAt: null };
  }
  const data = await request(ENDPOINTS.listingOffers(vehicleId), {
    method: 'POST',
    body: { amount: toMoney(price) },
    idempotencyKey,
  });
  const offer = data.offer ?? data;
  return {
    offerId: offer.offer_id,
    status: offer.status,
    amount: offer.amount?.amount_minor != null ? offer.amount.amount_minor / 100 : price,
    expiresAt: offer.expires_at ?? null,
  };
};

// --- MOCK state (raw backend shapes), created on first use ------------------

let mock = null;
export const mockOfferState = () => {
  mock ??= { buyer: sampleBuyerOffers(), seller: sampleListingOffers(), orders: sampleOrders() };
  return mock;
};

// Finds a mock offer and whose side it's on ('BUYER': my offer; 'SELLER': on my listing).
const findMock = offerId => {
  const state = mockOfferState();
  const mine = state.buyer.find(o => o.offer_id === offerId);
  if (mine) {
    return { offer: mine, side: 'BUYER' };
  }
  const received = state.seller.find(o => o.offer_id === offerId);
  if (received) {
    return { offer: received, side: 'SELLER' };
  }
  throw new ApiError({ status: 404, code: 'OFFER_NOT_FOUND', message: tNow('offers.error.notFound') });
};

const mockAccept = offer => {
  const state = mockOfferState();
  const orderId = `ord_mock_${offer.offer_id}`;
  offer.status = 'ACCEPTED';
  offer.order_id = orderId;
  state.orders[orderId] = {
    order_id: orderId,
    listing_id: offer.listing_id,
    offer_id: offer.offer_id,
    agreed_price: offer.amount,
    status: 'CREATED',
    cancel_reason: null,
    vehicle: offer.vehicle,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Accepting one offer declines the others on the same listing.
  state.seller
    .filter(o => o.listing_id === offer.listing_id && o !== offer && ['PENDING', 'COUNTERED'].includes(o.status))
    .forEach(o => {
      o.status = 'DECLINED';
    });
};

// --- Orders ------------------------------------------------------------------

export const getOrder = async orderId => {
  if (!real()) {
    await wait(200);
    const raw = mockOfferState().orders[orderId];
    if (!raw) {
      throw new ApiError({ status: 404, code: 'ORDER_NOT_FOUND', message: tNow('offers.error.notFound') });
    }
    return mapOrder(raw);
  }
  const data = await request(ENDPOINTS.order(orderId));
  return mapOrder(data.order);
};

// Accepted offers carry their order (loaded alongside, like the web). A failed
// order load leaves `order` null rather than failing the whole list.
export const withOrders = offers =>
  Promise.all(
    offers.map(async offer =>
      offer.status === 'ACCEPTED' && offer.orderId
        ? { ...offer, order: await getOrder(offer.orderId).catch(() => null) }
        : { ...offer, order: null },
    ),
  );

// Cancels an order (while CREATED; the buyer may also cancel after paying the
// token, which refunds it). Returns the order.
export const cancelOrder = async (orderId, reason = null) => {
  if (!real()) {
    await wait(600);
    const raw = mockOfferState().orders[orderId];
    raw.status = 'CANCELLED';
    raw.cancel_reason = reason;
    return mapOrder(raw);
  }
  const data = await request(ENDPOINTS.orderCancel(orderId), { method: 'POST', body: { reason } });
  return mapOrder(data.order);
};

// --- Offers --------------------------------------------------------------------

// The buyer's own offers, newest first, each with its order when accepted.
export const getMyOffers = async () => {
  let offers;
  if (!real()) {
    await wait(500);
    offers = mockOfferState().buyer.map(mapOffer);
  } else {
    const data = await request(ENDPOINTS.OFFERS);
    offers = (data.offers ?? []).map(mapOffer);
  }
  offers.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  return withOrders(offers);
};

// Runs one offer action on the backend. Returns the updated offer.
const offerAction = async (offerId, action, body) => {
  const data = await request(ENDPOINTS.offerAction(offerId, action), { method: 'POST', body });
  return mapOffer(data.offer);
};

// Accept: the buyer accepts a seller's counter, or the seller accepts an offer.
// Creates the order and reserves the vehicle.
export const acceptOffer = async offerId => {
  if (!real()) {
    await wait(600);
    const { offer } = findMock(offerId);
    mockAccept(offer);
    return mapOffer(offer);
  }
  return offerAction(offerId, 'accept');
};

// Counter with a new amount (rupees). The other side answers next.
export const counterOffer = async (offerId, amount) => {
  if (!real()) {
    await wait(600);
    const { offer, side } = findMock(offerId);
    // Seller's counter waits for the buyer (COUNTERED); a buyer's goes back to PENDING.
    const by = side === 'BUYER' ? 'BUYER' : 'SELLER';
    offer.amount = toMoney(amount);
    offer.status = by === 'SELLER' ? 'COUNTERED' : 'PENDING';
    offer.counter_history = [...(offer.counter_history ?? []), { by, amount: toMoney(amount), at: new Date().toISOString() }];
    offer.updated_at = new Date().toISOString();
    return mapOffer(offer);
  }
  return offerAction(offerId, 'counter', { amount: toMoney(amount) });
};

// The buyer takes their offer back (while PENDING / COUNTERED).
export const withdrawOffer = async offerId => {
  if (!real()) {
    await wait(500);
    const { offer } = findMock(offerId);
    offer.status = 'WITHDRAWN';
    return mapOffer(offer);
  }
  return offerAction(offerId, 'withdraw');
};

// The seller declines an offer (while PENDING / COUNTERED).
export const declineOffer = async (offerId, reason = null) => {
  if (!real()) {
    await wait(500);
    const { offer } = findMock(offerId);
    offer.status = 'DECLINED';
    offer.decline_reason = reason;
    return mapOffer(offer);
  }
  return offerAction(offerId, 'decline', { reason });
};

// Tests only.
export const resetMockOffers = () => {
  mock = null;
};
