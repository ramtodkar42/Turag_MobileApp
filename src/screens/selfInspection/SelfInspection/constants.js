// The web's self-inspection constants (self-inspection-ui.tsx): steps, the
// severity scale (consumer wording) and the "can't check" reasons. Labels are
// i18n keys; values are what the backend takes.

export const STEPS = ['documents', 'checklist', 'photos', 'review'];

export const SEVERITY_CHOICES = [
  { value: 'OK', labelKey: 'selfInspection.severity.OK' },
  { value: 'MINOR', labelKey: 'selfInspection.severity.MINOR' },
  { value: 'MODERATE', labelKey: 'selfInspection.severity.MODERATE' },
  { value: 'MAJOR', labelKey: 'selfInspection.severity.MAJOR' },
  { value: 'CRITICAL', labelKey: 'selfInspection.severity.CRITICAL' },
  { value: 'NOT_ASSESSABLE', labelKey: 'selfInspection.severity.NOT_ASSESSABLE' },
];

export const NA_REASONS = [
  'NO_KEY',
  'NO_BATTERY',
  'ACCESS_BLOCKED',
  'UNSAFE',
  'TOOL_UNAVAILABLE',
  'PART_MISSING',
  'WEATHER',
  'TIME_CONSTRAINT',
];

// The inspection officer's (M2) "can't check" reasons - the web inspector's 10.
export const NA_REASONS_INSPECTOR = [
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

// The required videos, guided (the web's GUIDED_VIDEOS), by shot code. Their lengths
// come from the checklist. checkCoverage: the walkaround's area check.
export const GUIDED_VIDEOS = {
  WALK_INT_EXT_VIDEO: {
    checkCoverage: true,
    tipKeys: ['selfInspection.gvideo.walk.exterior', 'selfInspection.gvideo.walk.interior', 'selfInspection.gvideo.walk.length'],
  },
  ENG_START_VIDEO: {
    checkCoverage: false,
    tipKeys: ['selfInspection.gvideo.engine.start', 'selfInspection.gvideo.engine.silent', 'selfInspection.gvideo.engine.exhaust'],
  },
};

// Identity / usage items that live with the documents (the web's DETAIL_ITEM_CODES).
export const DETAIL_ITEM_CODES = ['P1', 'A1', 'O1', 'O2'];
