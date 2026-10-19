// Sample bookings, report, offers, orders and a seller listing, in the exact
// shapes the backend returns (used when USE_REAL_API.bookings / .offers are
// false). Ids match the links in mock/notifications.js. Times are relative to
// "now". Each call returns fresh copies; the services keep their own state.
const HOUR = 60 * 60 * 1000;
const at = ms => new Date(Date.now() + ms).toISOString();
const money = rupees => ({ amount_minor: rupees * 100, currency: 'INR' });

export const sampleBookings = () => [
  {
    booking_id: 'bkg_mock_1',
    mode: 'DOORSTEP',
    category: 'PASSENGER',
    status: 'ASSIGNED',
    address_line: '12, MG Road, Shivajinagar',
    pincode: '411005',
    city: 'PUNE',
    slot_at: at(20 * HOUR),
    price: money(799),
    inspector_assigned: true,
    valuation_id: null,
    inspection_id: null,
    fee_paid: false,
    created_at: at(-26 * HOUR),
  },
  {
    booking_id: 'bkg_mock_2',
    mode: 'DOORSTEP',
    category: 'PASSENGER',
    status: 'FULFILLED',
    address_line: 'B-204, Green Park Society, Wakad',
    pincode: '411057',
    city: 'PCMC',
    slot_at: at(-5 * 24 * HOUR),
    price: money(799),
    inspector_assigned: true,
    valuation_id: null,
    inspection_id: 'insp_mock_r1',
    fee_paid: true,
    fee_paid_at: at(-7 * 24 * HOUR + 5 * 60 * 1000),
    created_at: at(-7 * 24 * HOUR),
  },
];

// GET /inspection-bookings/slots: the next 4 days, 10:00-18:00 every 2 hours,
// none within the next hour; one slot already full.
export const sampleSlots = (now = new Date()) => {
  const slots = [];
  for (let d = 0; d < 4; d += 1) {
    for (let hour = 10; hour < 19; hour += 2) {
      const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, 0, 0, 0);
      if (slot.getTime() - now.getTime() >= 60 * 60 * 1000) {
        slots.push({ slot_at: slot.toISOString(), available: !(d === 1 && hour === 12) });
      }
    }
  }
  return { slots, price: money(799) };
};

export const sampleMessages = () => [
  {
    message_id: 'msg_mock_1',
    body: 'Hi, I’m your Turag inspector. I’ll reach your place at the booked time.',
    sender_is_me: false,
    created_at: at(-3 * HOUR),
  },
  {
    message_id: 'msg_mock_2',
    body: 'Great, thank you! Parking is in the basement.',
    sender_is_me: true,
    created_at: at(-2 * HOUR),
  },
];

const band = (low, high) => ({ low: low * 100, high: high * 100 });

export const sampleReport = () => ({
  identity: { inspection_id: 'insp_mock_r1', version: 1, verified_at: at(-4 * 24 * HOUR) },
  vehicle: {
    make: 'KIA',
    model: 'Seltos',
    variant: 'HTX 1.5 Petrol',
    mfg_year: 2023,
    fuel: 'PETROL',
    category: 'PASSENGER',
    registration_number: 'MH12DX5087',
  },
  assessment: { grade: 'A', overall_score: 84, coverage_pct: 92, grade_not_ready: false },
  verification: {
    verification_label: 'TURAG_VERIFIED',
    turag_verified: true,
    validity: { valid_from: at(-4 * 24 * HOUR), valid_until: at(86 * 24 * HOUR), expired: false },
  },
  findings: [
    { item_code: 'B1', group: 'BODY', label: 'Rear bumper scratch', severity: 'MINOR', note: 'Light scratch, paint intact.', rectification_cost_minor: 2500 * 100 },
    { item_code: 'T2', group: 'TYRES', label: 'Front tyres', severity: 'MODERATE', note: 'About 30% tread left.', rectification_cost_minor: 9000 * 100 },
    { item_code: 'E1', group: 'ENGINE', label: 'Engine start and idle', severity: 'OK' },
    { item_code: 'A1', group: 'IDENTITY', label: 'VIN matches RC', severity: 'OK' },
  ],
  documents: [
    { doc_type: 'RC', status: 'PRESENT' },
    { doc_type: 'INSURANCE', status: 'PRESENT' },
    { doc_type: 'PUC', status: 'EXPIRED' },
  ],
  valuation: {
    status: 'READY',
    headline: { value: 1080000 * 100, band: 'retail' },
    bands: {
      distress: band(820000, 880000),
      auction: band(900000, 960000),
      trade_in: band(970000, 1030000),
      retail: band(1050000, 1110000),
    },
    confidence: { level: 'HIGH' },
  },
  inspector: { name: 'Isha Kulkarni' },
  odometer_km: 18400,
  generated_at: at(-4 * 24 * HOUR),
});

// The buyer's offers (GET /offers).
export const sampleBuyerOffers = () => [
  {
    offer_id: 'off_mock_1',
    listing_id: 'lst_mock_b1',
    amount: money(235000),
    status: 'COUNTERED',
    expires_at: at(30 * HOUR),
    counter_history: [{ by: 'SELLER', amount: money(235000), at: at(-3 * 24 * HOUR) }],
    decline_reason: null,
    order_id: null,
    vehicle: { make: 'Maruti Suzuki', model: 'Baleno', mfg_year: 2019 },
    created_at: at(-4 * 24 * HOUR),
    updated_at: at(-3 * 24 * HOUR),
  },
  {
    offer_id: 'off_mock_2',
    listing_id: 'lst_mock_b2',
    amount: money(220000),
    status: 'ACCEPTED',
    expires_at: at(20 * HOUR),
    counter_history: [],
    decline_reason: null,
    order_id: 'ord_mock_1',
    vehicle: { make: 'Maruti Suzuki', model: 'Swift', mfg_year: 2018 },
    created_at: at(-28 * HOUR),
    updated_at: at(-2 * HOUR),
  },
  {
    offer_id: 'off_mock_3',
    listing_id: 'lst_mock_b3',
    amount: money(510000),
    status: 'DECLINED',
    expires_at: at(-10 * HOUR),
    counter_history: [],
    decline_reason: null,
    order_id: null,
    vehicle: { make: 'Hyundai', model: 'i20', mfg_year: 2020 },
    created_at: at(-6 * 24 * HOUR),
    updated_at: at(-5 * 24 * HOUR),
  },
];

export const sampleOrders = () => ({
  ord_mock_1: {
    order_id: 'ord_mock_1',
    listing_id: 'lst_mock_b2',
    offer_id: 'off_mock_2',
    agreed_price: money(220000),
    status: 'CREATED',
    cancel_reason: null,
    vehicle: { make: 'Maruti Suzuki', model: 'Swift', mfg_year: 2018 },
    created_at: at(-2 * HOUR),
    updated_at: at(-2 * HOUR),
  },
});

// The seller's own listing (GET /listings/{id}) and its offers.
export const sampleMyListing = () => ({
  listing_id: 'lst_mock_1',
  status: 'LIVE',
  vehicle: { make: 'KIA', model: 'Seltos', variant: 'HTX 1.5 Petrol', mfg_year: 2023, fuel: 'PETROL', category: 'PASSENGER' },
  ask_price: money(895000),
  verification: { verification_label: 'TURAG_VERIFIED', turag_verified: true, grade: 'A' },
  moderation: null,
  published_at: at(-6 * 24 * HOUR),
  view_count: 148,
  version: 3,
  created_at: at(-8 * 24 * HOUR),
});

export const sampleListingOffers = () => [
  {
    offer_id: 'off_mock_s1',
    listing_id: 'lst_mock_1',
    amount: money(840000),
    status: 'PENDING',
    expires_at: at(44 * HOUR),
    counter_history: [],
    order_id: null,
    buyer_verification: { phone_verified: true },
    band_position: 'TRADE_IN',
    vehicle: { make: 'KIA', model: 'Seltos', mfg_year: 2023 },
    created_at: at(-10 * 60 * 1000),
  },
  {
    offer_id: 'off_mock_s2',
    listing_id: 'lst_mock_1',
    amount: money(870000),
    status: 'COUNTERED',
    expires_at: at(20 * HOUR),
    counter_history: [{ by: 'SELLER', amount: money(870000), at: at(-5 * HOUR) }],
    order_id: null,
    buyer_verification: { phone_verified: false },
    band_position: 'RETAIL',
    vehicle: { make: 'KIA', model: 'Seltos', mfg_year: 2023 },
    created_at: at(-30 * HOUR),
    updated_at: at(-5 * HOUR),
  },
];
