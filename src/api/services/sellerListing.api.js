// Selling (as the web's /sell pages) - needs sign-in:
// create a listing from a valued Garage vehicle (a DRAFT), submit it for
// review (a Turag moderator makes it LIVE), change the price, withdraw, and
// see My listings / one listing with the offers it received.
// Real backend when USE_REAL_API.listings is true (src/api/config.js), mock otherwise.
//
// Listing life: DRAFT -> PENDING_REVIEW -> LIVE (or REJECTED) -> RESERVED
// (an offer accepted) ...; WITHDRAWN / EXPIRED / REJECTED are final.
import { ApiError, request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { toMoney } from '../mappers/money';
import { mapListingSummary, mapMyListing, mapOffer } from '../mappers/offer';
import { sampleMyListing } from '../mock/account';
import { mockOfferState, withOrders } from './offer.api';
import { setMockGarageListing } from './garage.api';
import { tNow } from '../../i18n';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.listings;

// Newest first.
const byNewest = (a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0);

// --- MOCK state (raw backend shapes) -------------------------------------------

let mock = null;
const mockListings = () => {
  mock ??= [sampleMyListing()];
  return mock;
};
const findMock = listingId => {
  const raw = mockListings().find(l => l.listing_id === listingId);
  if (!raw) {
    throw new ApiError({ status: 404, code: 'LISTING_NOT_FOUND', message: tNow('selling.notFound.message') });
  }
  return raw;
};
const ACTIVE = new Set(['PENDING_REVIEW', 'LIVE']);
const touch = raw => {
  raw.version += 1;
  raw.updated_at = new Date().toISOString();
  if (raw.vehicle_id) {
    setMockGarageListing(raw.vehicle_id, ACTIVE.has(raw.status) ? raw.listing_id : null, ACTIVE.has(raw.status) ? raw.status : null);
  }
};

// --- Listings ------------------------------------------------------------------

// My listings, newest first (every status).
export const getMyListings = async () => {
  if (!real()) {
    await wait(500);
    return mockListings()
      .map(raw =>
        mapListingSummary({ ...raw, verification_label: raw.verification?.verification_label ?? 'NOT_VERIFIED' }),
      )
      .sort(byNewest);
  }
  const data = await request(ENDPOINTS.LISTINGS);
  return (data.listings ?? []).map(mapListingSummary);
};

// { listing, offers } - offers (each with its order when accepted) only while
// the listing is live / reserved; otherwise []. Someone else's listing is 404.
export const getMyListing = async listingId => {
  if (!real()) {
    await wait(500);
    const raw = findMock(listingId);
    const offers = mockOfferState()
      .seller.filter(o => o.listing_id === listingId)
      .map(mapOffer)
      .sort(byNewest);
    // Accepting an offer reserves the vehicle.
    if (raw.status === 'LIVE' && offers.some(o => o.status === 'ACCEPTED')) {
      raw.status = 'RESERVED';
    }
    const listing = mapMyListing(raw);
    return { listing, offers: listing.takesOffers ? await withOrders(offers) : [] };
  }
  const data = await request(ENDPOINTS.myListing(listingId));
  const listing = mapMyListing(data.listing);
  if (!listing.takesOffers) {
    return { listing, offers: [] };
  }
  const offersData = await request(ENDPOINTS.myListingOffers(listingId));
  const offers = (offersData.offers ?? []).map(mapOffer).sort(byNewest);
  return { listing, offers: await withOrders(offers) };
};

// Creates the listing (a DRAFT) from a valued vehicle.
// draft: { vehicleId, valuationId (required), inspectionId?, askPrice (₹), sellerNote?, idempotencyKey,
//          vehicle? (name for the mock) }
// ownership is attested by the seller on the form (required by the backend).
// Errors: 422 VALUATION_REQUIRED / VALUATION_EXPIRED / OWNERSHIP_ATTESTATION_REQUIRED,
//         409 LISTING_ALREADY_ACTIVE (the vehicle is already listed).
export const createListing = async ({
  vehicleId,
  valuationId,
  inspectionId = null,
  askPrice,
  sellerNote,
  idempotencyKey,
  vehicle,
}) => {
  const body = {
    vehicle_id: vehicleId,
    valuation_id: valuationId,
    inspection_id: inspectionId,
    ask_price: toMoney(askPrice),
    seller_note: sellerNote?.trim() ? sellerNote.trim() : null,
    ownership_attested: true,
  };
  if (!real()) {
    await wait(800);
    if (!valuationId) {
      throw new ApiError({ status: 422, code: 'VALUATION_REQUIRED', message: tNow('selling.create.valuationRequired') });
    }
    if (mockListings().some(l => l.vehicle_id === vehicleId && ACTIVE.has(l.status))) {
      throw new ApiError({ status: 409, code: 'LISTING_ALREADY_ACTIVE', message: tNow('selling.create.alreadyActive') });
    }
    const now = new Date().toISOString();
    const raw = {
      listing_id: `lst_mock_${Date.now()}`,
      vehicle_id: vehicleId,
      status: 'DRAFT',
      vehicle: { make: vehicle?.make ?? '', model: vehicle?.model ?? '', variant: null, mfg_year: vehicle?.year ?? null },
      ask_price: body.ask_price,
      seller_note: body.seller_note,
      verification: { verification_label: inspectionId ? 'SELF_DECLARED_UNVERIFIED' : 'NOT_VERIFIED', turag_verified: false },
      moderation: null,
      published_at: null,
      view_count: 0,
      version: 1,
      created_at: now,
    };
    mockListings().unshift(raw);
    return mapMyListing(raw);
  }
  const data = await request(ENDPOINTS.LISTINGS, { method: 'POST', body, idempotencyKey });
  return mapMyListing(data.listing);
};

// DRAFT -> PENDING_REVIEW (a Turag moderator checks it, usually within 4 hours).
export const submitListing = async listingId => {
  if (!real()) {
    await wait(600);
    const raw = findMock(listingId);
    raw.status = 'PENDING_REVIEW';
    touch(raw);
    return mapMyListing(raw);
  }
  const data = await request(ENDPOINTS.listingSubmit(listingId), { method: 'POST' });
  return mapMyListing(data.listing);
};

// New asking price (₹) - allowed while DRAFT or LIVE (a live listing stays live).
// `version`: the listing's current version (a stale one is refused - reload).
export const updateListingPrice = async (listingId, askPrice, version) => {
  if (!real()) {
    await wait(500);
    const raw = findMock(listingId);
    raw.ask_price = toMoney(askPrice);
    touch(raw);
    return mapMyListing(raw);
  }
  const data = await request(ENDPOINTS.myListing(listingId), {
    method: 'PATCH',
    body: { ask_price: toMoney(askPrice), version },
  });
  return mapMyListing(data.listing);
};

// Withdraws the listing (from DRAFT / PENDING_REVIEW / LIVE). Final.
export const withdrawListing = async (listingId, version) => {
  if (!real()) {
    await wait(500);
    const raw = findMock(listingId);
    raw.status = 'WITHDRAWN';
    touch(raw);
    return mapMyListing(raw);
  }
  const data = await request(ENDPOINTS.myListing(listingId), {
    method: 'PATCH',
    body: { status: 'WITHDRAWN', version },
  });
  return mapMyListing(data.listing);
};

// Tests only.
export const resetMockListings = () => {
  mock = null;
};
