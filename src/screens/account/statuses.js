// Status -> label key + Badge tone, same wording / colours as the web
// (positive -> success, warning -> warning, neutral -> neutral).

export const BOOKING_STATUS = {
  PENDING_PAYMENT: { labelKey: 'account.booking.status.PENDING_PAYMENT', tone: 'warning' },
  REQUESTED: { labelKey: 'account.booking.status.REQUESTED', tone: 'warning' },
  ASSIGNED: { labelKey: 'account.booking.status.ASSIGNED', tone: 'success' },
  ON_SITE: { labelKey: 'account.booking.status.ON_SITE', tone: 'success' },
  FULFILLED: { labelKey: 'account.booking.status.FULFILLED', tone: 'neutral' },
  CANCELLED: { labelKey: 'account.booking.status.CANCELLED', tone: 'neutral' },
};

// Progress steps (cancelled bookings show a note instead).
export const BOOKING_STEPS = ['REQUESTED', 'ASSIGNED', 'ON_SITE', 'FULFILLED'];

// Inspection findings.
export const SEVERITY = {
  OK: { labelKey: 'account.report.severity.OK', tone: 'success' },
  MINOR: { labelKey: 'account.report.severity.MINOR', tone: 'warning' },
  MODERATE: { labelKey: 'account.report.severity.MODERATE', tone: 'warning' },
  MAJOR: { labelKey: 'account.report.severity.MAJOR', tone: 'danger' },
  CRITICAL: { labelKey: 'account.report.severity.CRITICAL', tone: 'danger' },
  NOT_ASSESSABLE: { labelKey: 'account.report.severity.NOT_ASSESSABLE', tone: 'neutral' },
};

// Report documents.
export const DOCUMENT_STATUS = {
  PRESENT: { labelKey: 'account.report.docStatus.PRESENT', tone: 'success' },
  EXPIRED: { labelKey: 'account.report.docStatus.EXPIRED', tone: 'warning' },
  MISSING: { labelKey: 'account.report.docStatus.MISSING', tone: 'danger' },
  FLAGGED: { labelKey: 'account.report.docStatus.FLAGGED', tone: 'danger' },
  NOT_ASSESSED: { labelKey: 'account.report.docStatus.NOT_ASSESSED', tone: 'neutral' },
};

// The buyer's offers.
export const OFFER_STATUS = {
  PENDING: { labelKey: 'offers.status.PENDING', tone: 'neutral' },
  COUNTERED: { labelKey: 'offers.status.COUNTERED', tone: 'warning' },
  ACCEPTED: { labelKey: 'offers.status.ACCEPTED', tone: 'success' },
  DECLINED: { labelKey: 'offers.status.DECLINED', tone: 'neutral' },
  EXPIRED: { labelKey: 'offers.status.EXPIRED', tone: 'neutral' },
  WITHDRAWN: { labelKey: 'offers.status.WITHDRAWN', tone: 'neutral' },
};

// Orders (after an accepted offer). The seller sees "Awaiting token payment"
// for a new order; the buyer sees "Order created".
export const ORDER_STATUS = {
  CREATED: { labelKey: 'offers.order.CREATED', sellerLabelKey: 'selling.order.CREATED', tone: 'success' },
  TOKEN_PAID: { labelKey: 'offers.order.TOKEN_PAID', tone: 'success' },
  HANDED_OVER: { labelKey: 'offers.order.HANDED_OVER', tone: 'success' },
  COMPLETED: { labelKey: 'offers.order.COMPLETED', tone: 'success' },
  CANCELLED: { labelKey: 'offers.order.CANCELLED', tone: 'neutral' },
};

// Order ladder on the seller's page.
export const ORDER_STEPS = ['CREATED', 'TOKEN_PAID', 'HANDED_OVER', 'COMPLETED'];

// The seller's listing.
export const LISTING_STATUS = {
  DRAFT: { labelKey: 'selling.status.DRAFT', tone: 'neutral' },
  PENDING_REVIEW: { labelKey: 'selling.status.PENDING_REVIEW', tone: 'warning' },
  REJECTED: { labelKey: 'selling.status.REJECTED', tone: 'warning' },
  LIVE: { labelKey: 'selling.status.LIVE', tone: 'success' },
  RESERVED: { labelKey: 'selling.status.RESERVED', tone: 'warning' },
  WITHDRAWN: { labelKey: 'selling.status.WITHDRAWN', tone: 'neutral' },
  EXPIRED: { labelKey: 'selling.status.EXPIRED', tone: 'neutral' },
};

// Where an offer sits against the vehicle's fair-price bands.
export const BAND_POSITION = {
  RETAIL: { labelKey: 'selling.band.RETAIL', color: 'success' },
  TRADE_IN: { labelKey: 'selling.band.TRADE_IN', color: 'success' },
  AUCTION: { labelKey: 'selling.band.AUCTION', color: 'warning' },
  BELOW: { labelKey: 'selling.band.BELOW', color: 'danger' },
};
