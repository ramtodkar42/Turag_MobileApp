// Backend offers / orders / the seller's own listing -> the shapes the My offers
// and My listing screens use. Amounts in rupees, times in ms.
import { toRupees, toTime } from './money';

const vehicleOf = v => (v ? { make: v.make, model: v.model, year: v.mfg_year } : null);

// Who can still act on an offer (backend state machine).
const OPEN = new Set(['PENDING', 'COUNTERED']);

// OfferView -> {
//   id, listingId, status, amount (current - the latest counter after any counter),
//   amountBy ('BUYER' | 'SELLER': whose number `amount` is), lastBuyerAmount,
//   history [{ by, amount, at }], orderId, expiresAt, expired, open, ...
// }
export const mapOffer = o => {
  const history = (o.counter_history ?? []).map(h => ({
    by: h.by,
    amount: toRupees(h.amount),
    at: toTime(h.at),
  }));
  const last = history[history.length - 1];
  const lastBuyer = [...history].reverse().find(h => h.by === 'BUYER');
  const amount = toRupees(o.amount);
  const amountBy = last?.by ?? 'BUYER';
  const expiresAt = toTime(o.expires_at);
  return {
    id: o.offer_id,
    listingId: o.listing_id,
    status: o.status,
    amount,
    amountBy,
    // The buyer's own latest number (their first offer is replaced by counters).
    lastBuyerAmount: amountBy === 'BUYER' ? amount : lastBuyer?.amount ?? null,
    history,
    declineReason: o.decline_reason ?? null,
    orderId: o.order_id ?? null,
    phoneVerified: !!o.buyer_verification?.phone_verified,
    bandPosition: o.band_position ?? null,
    vehicle: vehicleOf(o.vehicle),
    expiresAt,
    expired: expiresAt != null && expiresAt <= Date.now(),
    open: OPEN.has(o.status),
    createdAt: toTime(o.created_at),
    updatedAt: toTime(o.updated_at) ?? toTime(o.created_at),
  };
};

// OrderView -> { id, listingId, offerId, agreedPrice (₹), status, cancelReason, vehicle, handoverAt }
export const mapOrder = o => ({
  id: o.order_id,
  listingId: o.listing_id,
  offerId: o.offer_id,
  agreedPrice: toRupees(o.agreed_price),
  status: o.status,
  cancelReason: o.cancel_reason ?? null,
  vehicle: vehicleOf(o.vehicle),
  createdAt: toTime(o.created_at),
  updatedAt: toTime(o.updated_at),
  handoverAt: toTime(o.handover_at),
});

// Ownership-transfer checklist item (§8.1) -> { code, label, required,
// responsible ('SELLER' | 'BUYER' | 'OPS'), status ('PENDING' | 'PROVIDED' |
// 'VERIFIED' | 'WAIVED' | 'NOT_APPLICABLE'), document ({ fileName,
// contentType, size, uploadedAt }) | null }
export const mapTransferItem = i => ({
  code: i.code,
  label: i.label,
  required: !!i.required,
  responsible: i.responsible,
  status: i.status,
  document: i.document
    ? {
        fileName: i.document.file_name,
        contentType: i.document.content_type,
        size: i.document.size_bytes ?? 0,
        uploadedAt: toTime(i.document.uploaded_at),
      }
    : null,
});

// The checklist -> { version, items }.
export const mapTransferChecklist = c => ({
  version: c?.version ?? 1,
  items: (c?.items ?? []).map(mapTransferItem),
});

// What the seller can do with a listing in each status (backend state machine).
const PRICE_EDITABLE = new Set(['DRAFT', 'LIVE']);
const WITHDRAWABLE = new Set(['DRAFT', 'PENDING_REVIEW', 'LIVE']);

// ListingView (the seller's own) -> the My listing screen's listing.
export const mapMyListing = l => ({
  id: l.listing_id,
  status: l.status,
  vehicle: {
    make: l.vehicle?.make ?? '',
    model: l.vehicle?.model ?? '',
    variant: l.vehicle?.variant ?? null,
    year: l.vehicle?.mfg_year ?? null,
  },
  askPrice: toRupees(l.ask_price),
  sellerNote: l.seller_note ?? null,
  // Where the vehicle is (buyers see the area, city and state), null on older listings.
  location: l.location
    ? { city: l.location.city ?? '', state: l.location.state ?? '', locality: l.location.locality ?? null }
    : null,
  // The pinned inspection, if any - its report is what buyers see.
  inspectionId: l.inspection_id ?? null,
  grade: l.verification?.grade ?? null,
  turagVerified: !!l.verification?.turag_verified,
  verificationLabel: l.verification?.verification_label ?? null,
  moderationReason: l.moderation?.reason ?? null,
  publishedAt: toTime(l.published_at),
  expiresAt: toTime(l.expires_at),
  createdAt: toTime(l.created_at),
  viewCount: l.view_count ?? 0,
  // Sent back with every change (the backend refuses a stale one).
  version: l.version ?? 1,
  // Offers exist (and can be answered) only while live / reserved.
  takesOffers: l.status === 'LIVE' || l.status === 'RESERVED',
  canSubmit: l.status === 'DRAFT',
  canEditPrice: PRICE_EDITABLE.has(l.status),
  canWithdraw: WITHDRAWABLE.has(l.status),
});

// GET /listings item (ListingSummary) -> a My listings row.
export const mapListingSummary = l => ({
  id: l.listing_id,
  status: l.status,
  vehicle: { make: l.vehicle?.make ?? '', model: l.vehicle?.model ?? '', year: l.vehicle?.mfg_year ?? null },
  askPrice: toRupees(l.ask_price),
  verificationLabel: l.verification_label ?? null,
  createdAt: toTime(l.created_at),
  publishedAt: toTime(l.published_at),
  expiresAt: toTime(l.expires_at),
});
