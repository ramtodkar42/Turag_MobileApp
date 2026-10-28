// Backend booking / booking chat / inspection report -> the shapes the
// My booking and Report screens use.
import { toRupees, toTime } from './money';
import { mapValuation } from './valuation';
import { mapChallans } from './challans';

const titleCase = value =>
  value
    ? String(value)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    : null;

// Only these can be cancelled by the customer (backend isCustomerCancellable).
const CANCELLABLE = new Set(['REQUESTED', 'ASSIGNED']);
// Chat with the inspector: once one is assigned, until the booking ends.
const CHAT_CLOSED = new Set(['CANCELLED', 'FULFILLED']);

// GET /inspection-bookings item ->
// { id, status, category, mode, slotAt (ms), address, pincode, city, price (₹),
//   inspectorAssigned, inspectionId (report), canCancel, chatOpen,
//   building, landmark, location ({ latitude, longitude } | null), ... }
export const mapBooking = b => ({
  id: b.booking_id,
  status: b.status,
  mode: b.mode,
  category: b.category,
  slotAt: toTime(b.slot_at),
  address: b.address_line ?? '',
  pincode: b.pincode ?? '',
  city: titleCase(b.city),
  price: toRupees(b.price),
  inspectorAssigned: !!b.inspector_assigned,
  valuationId: b.valuation_id ?? null,
  inspectionId: b.inspection_id ?? null,
  feePaid: !!b.fee_paid,
  feePaidAt: toTime(b.fee_paid_at),
  cityCode: b.city ?? null, // 'PUNE' | 'PCMC' | null
  building: b.building ?? null,
  landmark: b.landmark ?? null,
  // The customer's map pin on the doorstep (null when none was set).
  location:
    b.geo_lat != null && b.geo_lng != null ? { latitude: Number(b.geo_lat), longitude: Number(b.geo_lng) } : null,
  createdAt: toTime(b.created_at),
  canCancel: CANCELLABLE.has(b.status),
  chatOpen: !!b.inspector_assigned && !CHAT_CLOSED.has(b.status),
});

// GET /inspection-bookings/slots -> {
//   price (₹, null = booking switched off), enabled,
//   days: [{ key ('2026-10-06'), time (ms of the day's first slot), slots: [{ slotAt, time, available }] }]
// } - slots grouped by the phone's calendar day, in order. `slotAt` is the
// backend's exact string (sent back when booking).
export const mapSlots = data => {
  const price = toRupees(data?.price);
  const days = [];
  (data?.slots ?? []).forEach(slot => {
    const time = toTime(slot.slot_at);
    if (time == null) {
      return;
    }
    const date = new Date(time);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    let day = days.find(d => d.key === key);
    if (!day) {
      day = { key, time, slots: [] };
      days.push(day);
    }
    day.slots.push({ slotAt: slot.slot_at, time, available: slot.available !== false });
  });
  days.sort((a, b) => a.time - b.time).forEach(day => day.slots.sort((a, b) => a.time - b.time));
  // payments_available: false while no live payment gateway is set up - the
  // slots and price are real but the fee can't be taken, so nothing can be
  // booked yet. Older servers don't send it (= available).
  return { price, enabled: price != null, paymentsAvailable: data?.payments_available !== false, days };
};

// Chat message -> { id, text, mine, createdAt (ms) }
export const mapBookingMessage = m => ({
  id: m.message_id,
  text: m.body,
  mine: !!m.sender_is_me,
  createdAt: toTime(m.created_at) ?? Date.now(),
});

const GRADES = { A_PLUS: 'A+', A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' };

// Findings worth showing first: worst severity first.
const SEVERITY_ORDER = ['CRITICAL', 'MAJOR', 'MODERATE', 'MINOR', 'NOT_ASSESSABLE', 'OK'];

// GET /reports/{inspectionId} report -> summary for the Report screen.
export const mapReport = r => {
  const assessment = r.assessment ?? {};
  const verification = r.verification ?? {};
  const findings = (r.findings ?? [])
    .map(f => ({
      code: f.item_code,
      group: f.group,
      label: f.label,
      severity: f.severity,
      note: f.note ?? null,
      cost: toRupees(f.rectification_cost_minor),
    }))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return {
    inspectionId: r.identity?.inspection_id ?? null,
    // The public check that the report is genuine: /verify/<token> (null until issued).
    verificationToken: r.identity?.verification_token ?? null,
    vehicle: {
      make: r.vehicle?.make ?? '',
      model: r.vehicle?.model ?? '',
      variant: r.vehicle?.variant ?? null,
      year: r.vehicle?.mfg_year ?? null,
      fuel: titleCase(r.vehicle?.fuel),
      registrationNumber: r.vehicle?.registration_number ?? null,
    },
    grade: GRADES[assessment.grade] ?? null,
    score: assessment.overall_score ?? null,
    coverage: assessment.coverage_pct ?? null,
    gradeNotReady: !!assessment.grade_not_ready,
    verificationLabel: verification.verification_label ?? null,
    turagVerified: !!verification.turag_verified,
    validUntil: verification.validity?.valid_until ?? null,
    expired: !!verification.validity?.expired,
    findings,
    issues: findings.filter(f => !['OK', 'NOT_ASSESSABLE'].includes(f.severity)).length,
    documents: (r.documents ?? []).map(d => ({ type: d.doc_type, status: d.status, detail: d.detail ?? null })),
    valuation: r.valuation?.status === 'READY' ? mapValuation(r.valuation) : null,
    inspectorName: r.inspector?.name ?? null,
    odometerKm: r.odometer_km ?? null,
    disclaimer: r.disclaimer ?? null,
    generatedAt: r.generated_at ?? null,
    // Traffic challans from the latest check, or null (never checked).
    challans: mapChallans(r.challans),
  };
};
