// Inspector: the job expiry rule, and capture answer choices, N/A reasons and
// photo names (backend codes).

// How long after its slot an un-started job can still be started (1 hour).
// Mirrors the backend's start grace (ADR-0040); the server still decides and
// answers 409 BOOKING_EXPIRED - this only groups the list and hides Start.
export const BOOKING_START_GRACE_MS = 60 * 60 * 1000;

// Expired: still ASSIGNED (never started) and more than the grace past its
// slot. An ON_SITE visit, or one whose inspection has started (the server may
// not have moved it on yet), is underway, so never expired. No slot: can't tell.
export const isJobExpired = (job, now = Date.now()) =>
  job?.status === 'ASSIGNED' &&
  !job.inspectionId &&
  job.slotAt != null &&
  now >= job.slotAt + BOOKING_START_GRACE_MS;

// The manual-identify fuel choices (backend codes, as the web's select).
export const FUELS = ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'];

// STATE items: how bad it is (the web's six chips).
export const STATE_OPTIONS = [
  { value: 'OK', labelKey: 'inspector.severity.OK' },
  { value: 'MINOR', labelKey: 'inspector.severity.MINOR' },
  { value: 'MODERATE', labelKey: 'inspector.severity.MODERATE' },
  { value: 'MAJOR', labelKey: 'inspector.severity.MAJOR' },
  { value: 'CRITICAL', labelKey: 'inspector.severity.CRITICAL' },
  { value: 'NOT_ASSESSABLE', labelKey: 'inspector.severity.NOT_ASSESSABLE' },
];

// BOOL items: Yes -> OK, No -> MAJOR (backend rule).
export const BOOL_OPTIONS = [
  { value: 'OK', labelKey: 'common.yes' },
  { value: 'MAJOR', labelKey: 'common.no' },
  { value: 'NOT_ASSESSABLE', labelKey: 'inspector.severity.NOT_ASSESSABLE' },
];

// Severities that get an estimated repair cost (as the web).
export const COSTED = new Set(['MODERATE', 'MAJOR', 'CRITICAL']);

// Why an item couldn't be checked (needed with NOT_ASSESSABLE).
export const NA_REASONS = [
  'VEHICLE_STATIC',
  'NO_KEY',
  'NO_BATTERY',
  'ACCESS_BLOCKED',
  'OWNER_REFUSED',
  'UNSAFE',
  'TOOL_UNAVAILABLE',
  'PART_MISSING',
  'WEATHER',
  'TIME_CONSTRAINT',
];

// Photo / document names by shot code (others are shown from the code).
export const SHOT_LABEL_KEYS = {
  WALK_FRONT: 'valuation.angle.front',
  WALK_FRONT_RIGHT: 'valuation.angle.frontRight',
  WALK_RIGHT: 'valuation.angle.rightSide',
  WALK_REAR_RIGHT: 'valuation.angle.rearRight',
  WALK_REAR: 'valuation.angle.rear',
  WALK_REAR_LEFT: 'valuation.angle.rearLeft',
  WALK_LEFT: 'valuation.angle.leftSide',
  WALK_FRONT_LEFT: 'valuation.angle.frontLeft',
  RC_FRONT: 'inspector.shot.RC_FRONT',
  INSURANCE_POLICY: 'inspector.shot.INSURANCE_POLICY',
  PUC_CERT: 'inspector.shot.PUC_CERT',
};

// "ENG_OIL_CAP" -> "Eng oil cap"
export const shotFallback = code => {
  const text = String(code).toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const MAX_PHOTO_MB = 15; // backend limit for photos
export const MAX_DOCUMENT_MB = 20; // backend limit for documents (PDF / image)
