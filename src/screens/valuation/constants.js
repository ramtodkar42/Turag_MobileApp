// Shared by the Evaluate flow. Display text is i18n keys (labelKey); `value` is data.

// "Any accident history?" -> the backend's declared condition (same as the web:
// no accident is GOOD, never EXCELLENT, which needs inspection evidence).
export const ACCIDENT_OPTIONS = [
  { value: 'none', labelKey: 'valuation.accident.none', condition: 'GOOD', bodySeverity: 'OK' },
  { value: 'minor', labelKey: 'valuation.accident.minor', condition: 'FAIR', bodySeverity: 'MINOR' },
  { value: 'major', labelKey: 'valuation.accident.major', condition: 'POOR', bodySeverity: 'MAJOR' },
];



