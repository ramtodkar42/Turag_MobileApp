// Backend marketplace listing -> the vehicle shape the screens use.
// Prices come as paise ({ amount_minor }); screens use rupees.
// `id` is the backend listing id (used for details, offers and saving).
import { mapChallans } from './challans';

const toRupees = money => (money?.amount_minor != null ? Math.round(money.amount_minor / 100) : null);

const titleCase = value =>
  value
    ? String(value)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    : null;

// Backend city codes -> how the app shows them.
const CITY_LABELS = { PUNE: 'Pune', PCMC: 'PCMC', MUMBAI: 'Mumbai' };
const cityLabel = city => (city ? CITY_LABELS[String(city).toUpperCase()] ?? titleCase(city) : null);

// Backend category <-> app category tab.
export const CATEGORY_TO_API = { cars: 'PASSENGER', bikes: 'TWO_WHEELER' };
const CATEGORY_FROM_API = { PASSENGER: 'cars', TWO_WHEELER: 'bikes' };
const VEHICLE_TYPES = { PASSENGER: 'Four Wheeler', TWO_WHEELER: 'Two Wheeler' };

export const GRADE_LABELS = { A_PLUS: 'A+', A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' };

// Turag vehicle tiers (the web's vehicle-tier.ts), lowest first.
export const TIERS = ['BUDGET', 'ASSURED', 'PREMIUM'];

const VERIFICATION_LABELS = {
  TURAG_VERIFIED: 'TURAG Verified',
  VERIFIED_NOT_TURAG: 'Verified',
  SELF_DECLARED_UNVERIFIED: 'Self-declared',
  NOT_VERIFIED: 'Not inspected yet',
};

// Fair-price check shown on the vehicle page.
const ASSESSMENTS = {
  FAIRLY_PRICED: { label: 'Fairly priced', tone: 'success' },
  BELOW_ESTIMATE: { label: 'Below estimate', tone: 'success' },
  ABOVE_ESTIMATE: { label: 'Above estimate', tone: 'warning' },
};

// Fixed labels are also sent as i18n keys (…Key fields) so screens show them in
// the current language; the English fields stay for older code and tests.
// Fuel, transmission, body type and colour keep their raw backend code (…Code)
// for the screens to look up ('marketplace.fuel.DIESEL', …).
const vehicleTypeKey = category =>
  `marketplace.vehicleType.${VEHICLE_TYPES[category] ? category : 'OTHER'}`;
const inspectionKey = label => (VERIFICATION_LABELS[label] ? `marketplace.inspection.${label}` : null);

const mapFairPrice = fair => {
  const low = toRupees(fair?.estimate_low);
  const high = toRupees(fair?.estimate_high);
  const assessment = ASSESSMENTS[fair?.assessment];
  return assessment && low && high
    ? { low, high, ...assessment, labelKey: `marketplace.fairPrice.${fair.assessment}` }
    : null;
};

const vehicleFields = item => ({
  id: item.listing_id,
  name: [item.make, item.model].filter(Boolean).join(' '),
  make: item.make,
  model: item.model,
  variant: item.variant ?? null,
  year: item.mfg_year,
  fuel: titleCase(item.fuel),
  transmission: titleCase(item.transmission),
  bodyType: titleCase(item.body_type),
  color: titleCase(item.color),
  fuelCode: item.fuel ?? null,
  transmissionCode: item.transmission ?? null,
  bodyTypeCode: item.body_type ?? null,
  colorCode: item.color ?? null,
  seats: item.seating_capacity ?? null,
  engineCc: item.engine_cc ?? null,
  mileageKmpl: item.mileage_kmpl ?? null,
  category: CATEGORY_FROM_API[item.category] ?? 'cars',
  vehicleType: VEHICLE_TYPES[item.category] ?? 'Vehicle',
  vehicleTypeKey: vehicleTypeKey(item.category),
  city: cityLabel(item.city),
  // The seller's area and state (free text from the map): "Baner, Pune".
  locality: item.locality || null,
  state: item.state || null,
  place: [item.locality, cityLabel(item.city)].filter(Boolean).join(', ') || null,
  // 'BUDGET' | 'ASSURED' | 'PREMIUM' (from the verified inspection + price), null on older servers.
  tier: TIERS.includes(item.tier) ? item.tier : null,
  price: toRupees(item.ask_price),
  reserved: item.status === 'RESERVED',
  fairPrice: mapFairPrice(item.fair_price),
  publishedAt: item.published_at ?? null,
});

// Grid card (GET /marketplace/listings, saved listings).
export const mapListingSummary = item => ({
  ...vehicleFields(item),
  grade: GRADE_LABELS[item.grade] ?? null,
  verified: item.verification_label === 'TURAG_VERIFIED',
  inspection: VERIFICATION_LABELS[item.verification_label] ?? null,
  inspectionKey: inspectionKey(item.verification_label),
  majorIssues: item.findings_summary?.major_count ?? null,
  image: item.hero_photo_url ? { uri: item.hero_photo_url } : null,
});

const mapReport = report =>
  report
    ? {
        grade: GRADE_LABELS[report.grade] ?? null,
        // 0-100 from the backend; the app shows it out of 10.
        score: report.overall_score != null ? Math.round(report.overall_score) / 10 : null,
        coverage: report.coverage_pct != null ? Math.round(report.coverage_pct) : null,
        breakdown: (report.score_breakdown ?? []).map(group => ({
          code: group.group_code,
          label: group.group_label,
          score: Math.round(group.score) / 10,
        })),
        // Full public findings (worst-first) and document checks, as the web
        // shows buyers. rectification cost is minor units -> rupees.
        findings: (report.findings ?? []).map(f => ({
          code: f.item_code,
          group: f.group,
          label: f.label,
          severity: f.severity,
          note: f.note ?? null,
          cost: f.rectification_cost_minor != null ? f.rectification_cost_minor / 100 : null,
        })),
        documents: (report.documents ?? []).map(d => ({
          type: d.doc_type,
          status: d.status,
          detail: d.detail ?? null,
        })),
        issues: (report.findings ?? []).filter(f => f.severity === 'MAJOR' || f.severity === 'CRITICAL')
          .length,
        inspectorName: report.inspector_name ?? null,
        validUntil: report.valid_until ?? null,
        expired: !!report.expired,
        turagVerified: !!report.turag_verified,
        ready: !report.grade_not_ready,
      }
    : null;

// Photo tabs on the vehicle page, in the same fixed order as the web; only
// categories that have photos are kept.
const PHOTO_CATEGORY_ORDER = [
  'EXTERIOR',
  'ENGINE',
  'INTERIOR',
  'TYRE',
  'UNDERBODY',
  'IDENTITY',
  'DOCUMENT',
  'EXTRAS',
];

// [{ category, url, shot_code?, label? }] -> [{ category, images: [{ uri, label, shotCode }] }].
// label: the photo's caption ("Front Left", "Instrument Cluster"), null on older
// servers. Empty for older listings without categories (the flat gallery shows).
const mapPhotoGroups = (photosByCategory = []) =>
  PHOTO_CATEGORY_ORDER.map(category => ({
    category,
    images: photosByCategory
      .filter(p => p.category === category)
      .map(p => ({ uri: p.url, label: p.label || null, shotCode: p.shot_code ?? null })),
  })).filter(group => group.images.length > 0);

// Vehicle page (GET /marketplace/listings/{id}).
export const mapListingDetail = item => {
  const report = mapReport(item.report);
  const photos = item.photos ?? [];
  const label = VERIFICATION_LABELS[item.report?.verification_label]
    ? item.report.verification_label
    : 'NOT_VERIFIED';
  return {
    ...vehicleFields(item),
    grade: report?.grade ?? null,
    verified: item.report?.verification_label === 'TURAG_VERIFIED',
    inspection: VERIFICATION_LABELS[label],
    inspectionKey: inspectionKey(label),
    report,
    images: photos.map(uri => ({ uri })),
    image: photos[0] ? { uri: photos[0] } : null,
    photoGroups: mapPhotoGroups(item.photos_by_category),
    eligible: item.eligibility?.eligible !== false,
    ineligibleReason: item.eligibility?.reason ?? null,
    // The backend never sends the seller's note publicly.
    description: null,
    // Traffic challans from the latest check, or null (never checked).
    challans: mapChallans(item.challans),
  };
};
