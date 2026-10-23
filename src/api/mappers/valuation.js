// Backend vehicle / valuation / garage data -> the shapes the Evaluate and
// Garage screens use. Money from the backend is integer paise; screens use rupees.

const toRupees = paise => (paise != null ? Math.round(paise / 100) : null);

const titleCase = value =>
  value
    ? String(value)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    : null;

// Backend category -> the label key used by the marketplace screens.
const CATEGORY_KEYS = {
  PASSENGER: 'marketplace.vehicleType.PASSENGER',
  TWO_WHEELER: 'marketplace.vehicleType.TWO_WHEELER',
};

// Self-inspection (M1) is defined for cars only on the backend.
export const supportsSelfInspection = vehicle => vehicle?.category === 'PASSENGER';

// POST /vehicles/propose or /confirm -> vehicle. `registrationNumber` is the
// plate the user typed (the backend never sends it back).
export const mapVehicle = (data, { registrationNumber } = {}) => {
  const registry = data.registry ?? {};
  return {
    vehicleId: data.vehicle_id ?? null,
    registrationNumber,
    make: data.make,
    model: data.model,
    variant: data.variant_text ?? null,
    year: data.mfg_year,
    fuelCode: data.fuel,
    fuel: titleCase(data.fuel),
    category: data.category,
    categoryKey: CATEGORY_KEYS[data.category] ?? null,
    rcCity: registry.rc_city ?? null,
    rcState: registry.rc_state ?? null,
    rcStatus: registry.rc_status ?? null,
    ownerCount: registry.owner_count ?? null,
    color: titleCase(registry.color),
    bodyType: titleCase(registry.body_type),
    engineCc: registry.engine_cc ?? null,
    seats: registry.seat_capacity ?? null,
    registrationDate: registry.registration_date ?? null,
    insuranceCompany: registry.insurance_company ?? null,
    insuranceUpto: registry.insurance_upto ?? null,
    taxUpto: registry.tax_upto ?? null,
    pucUpto: registry.pucc_upto ?? null,
    fitnessUpto: registry.fit_upto ?? null,
    financed: registry.financed ?? null,
  };
};

const band = value => ({ min: toRupees(value?.low), max: toRupees(value?.high) });

// valuationOutput -> { valuationId, estimatedValue, priceBands, confidence, ... }.
export const mapValuation = valuation => ({
  valuationId: valuation.valuation_id,
  vehicleId: valuation.vehicle_id,
  stage: valuation.stage,
  estimatedValue: toRupees(valuation.headline?.value),
  headlineBand: valuation.headline?.band ?? null,
  priceBands: {
    distress: band(valuation.bands?.distress),
    auction: band(valuation.bands?.auction),
    tradeIn: band(valuation.bands?.trade_in),
    retail: band(valuation.bands?.retail),
  },
  confidence: valuation.confidence?.level ?? null,
  validUntil: valuation.valid_until ?? null,
});

// Garage status from the latest inspection of the vehicle.
// verified: Turag verified; not_inspected: none yet (or not finished);
// in_review: submitted and with Turag (checks, QC, re-inspection...).
const VERIFIED = new Set(['VERIFIED', 'VALUED', 'PUBLISHED']);
const NOT_INSPECTED = new Set([null, undefined, 'DRAFT', 'IN_PROGRESS', 'ABANDONED', 'EXPIRED']);

const garageStatus = inspectionStatus => {
  if (VERIFIED.has(inspectionStatus)) {
    return 'verified';
  }
  return NOT_INSPECTED.has(inspectionStatus) ? 'not_inspected' : 'in_review';
};

// Where a garage vehicle is, as the web's Garage card works it out (from the
// LATEST inspection; `inspection_eligible` = a report-ready one exists):
//   listed      - has a listing
//   can_list    - inspected and ready to list
//   resume_self - the user's own self-inspection is still open (continue it)
//   in_review   - an inspection is with Turag (submitted / QC / an inspector job)
//   fresh       - no inspection yet
// A DRAFT self-inspection can't be edited, so (unlike the web, where it's a
// dead end) it counts as fresh: the user simply starts again.
const REPORT_READY = new Set(['VERIFIED', 'VALUED', 'PUBLISHED', 'EXPIRED']);
const RESUMABLE_SELF = new Set(['IN_PROGRESS', 'INTEGRITY_FAILED']);

export const garagePhase = item => {
  const status = item.inspection_status ?? null;
  const hasInspection = item.inspection_id != null && status != null;
  if (item.valuation_id != null && item.listing_status != null) return 'listed';
  if (item.inspection_eligible === true) return 'can_list';
  if (hasInspection && item.inspection_mode === 'M1' && RESUMABLE_SELF.has(status)) return 'resume_self';
  if (hasInspection && !(item.inspection_mode === 'M1' && status === 'DRAFT')) return 'in_review';
  return 'fresh';
};

// GET /saved-vehicles item -> garage vehicle.
export const mapSavedVehicle = item => ({
  id: item.id,
  vehicleId: item.vehicle_id,
  valuationId: item.valuation_id ?? null,
  inspectionId: item.inspection_id ?? null,
  inspectionStatus: item.inspection_status ?? null,
  inspectionMode: item.inspection_mode ?? null, // 'M1' (self) | 'M2' (inspector)
  phase: garagePhase(item),
  // The report opens only from a finished (frozen) inspection.
  reportReady: item.inspection_id != null && REPORT_READY.has(item.inspection_status),
  // ADR-0038: a vehicle can only be listed once it has a report-ready
  // inspection (self or inspector). The backend decides this.
  inspectionEligible: item.inspection_eligible === true,
  status: garageStatus(item.inspection_status),
  listed: !!item.listing_id,
  listingId: item.listing_id ?? null,
  listingStatus: item.listing_status ?? null,
  make: item.vehicle?.make ?? '',
  model: item.vehicle?.model ?? '',
  year: item.vehicle?.mfg_year ?? null,
  fuelCode: item.vehicle?.fuel ?? null,
  fuel: titleCase(item.vehicle?.fuel),
  category: item.vehicle?.category ?? null,
  categoryKey: CATEGORY_KEYS[item.vehicle?.category] ?? null,
  estimatedValue: toRupees(item.headline?.value),
  savedOn: item.created_at ? item.created_at.slice(0, 10) : null,
  image: null,
});
