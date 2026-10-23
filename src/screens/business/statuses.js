// Business status -> label key + Badge tone, same colours as the web's
// portal tables (positive -> success, warning -> warning, else neutral).

const label = (group, value) => `business.${group}.${value}`;

// Org membership status.
const ORG_TONE = { ACTIVE: 'success', PENDING: 'warning', SUSPENDED: 'danger' };
export const orgStatus = status => ({ labelKey: label('orgStatus', status), tone: ORG_TONE[status] ?? 'neutral' });

// Listing / portfolio status (dealer portal: live green, in review / reserved amber).
const LISTING_TONE = { LIVE: 'success', PENDING_REVIEW: 'warning', RESERVED: 'warning', REJECTED: 'warning' };
export const listingStatus = status => ({
  labelKey: label('listingStatus', status),
  tone: LISTING_TONE[status] ?? 'neutral',
});

// Intake / yard status (institutional portal: released green, cancelled amber).
const RECORD_TONE = { RELEASED: 'success', CANCELLED: 'warning' };
export const intakeStatus = status => ({ labelKey: label('intakeStatus', status), tone: RECORD_TONE[status] ?? 'neutral' });
export const placementStatus = status => ({
  labelKey: label('placementStatus', status),
  tone: RECORD_TONE[status] ?? 'neutral',
});

// Portfolio ageing: fresh green, stale / old amber.
const AGEING_TONE = { FRESH: 'success', STALE: 'warning', OLD: 'warning' };
export const ageingBucket = bucket => ({ labelKey: label('ageing', bucket), tone: AGEING_TONE[bucket] ?? 'neutral' });

// Bulk import job + row outcomes.
const JOB_TONE = { COMPLETED: 'success', PARTIALLY_COMPLETED: 'warning', FAILED: 'danger', CANCELLED: 'neutral' };
export const importStatus = status => ({ labelKey: label('importStatus', status), tone: JOB_TONE[status] ?? 'neutral' });
const ROW_TONE = { CREATED: 'success', SKIPPED_DUPLICATE: 'neutral' };
export const rowStatus = status => ({ labelKey: label('rowStatus', status), tone: ROW_TONE[status] ?? 'warning' });

// Option lists (values the backend takes; labels are keys).
export const CATEGORIES = ['PASSENGER', 'TWO_WHEELER'];
export const FUELS = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'];
export const CITIES = ['PUNE', 'PCMC'];
export const PORTFOLIO_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'LIVE', 'RESERVED', 'WITHDRAWN', 'EXPIRED'];
export const AGEING_BUCKETS = ['FRESH', 'AGEING', 'STALE', 'OLD'];

// A known code's label key, or the raw value for anything new from the server.
export const labelOr = (t, key, raw) => {
  const text = t(key);
  return text === key ? raw ?? '' : text;
};

// Long ids are shown shortened (the full one is in the detail).
export const shortId = id => (id && id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id ?? '');
