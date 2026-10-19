// Sample inspector data in the exact shapes the backend returns (used when
// USE_REAL_API.inspector is false): the job queue, a passenger (M2)
// checklist - the backend's mandatory items plus a few optional ones - and an
// inspection in progress. Times are relative to "now".
const HOUR = 60 * 60 * 1000;
const at = ms => new Date(Date.now() + ms).toISOString();
const money = rupees => ({ amount_minor: rupees * 100, currency: 'INR' });

// The next whole hour, `hours` from now (a realistic slot time).
const slot = hours => {
  const date = new Date(Date.now() + hours * HOUR);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
};

export const sampleQueue = () => [
  {
    booking_id: 'job_mock_1',
    mode: 'DOORSTEP',
    category: 'PASSENGER',
    status: 'ASSIGNED',
    address_line: 'Flat 1009, Sahyadri Residency, Baner',
    pincode: '411045',
    city: 'PUNE',
    slot_at: slot(20),
    price: money(799),
    inspector_assigned: true,
    valuation_id: null,
    inspection_id: null,
    fee_paid: false,
    created_at: at(-26 * HOUR),
    inspector_id: 'usr_inspector',
  },
  {
    booking_id: 'job_mock_2',
    mode: 'DOORSTEP',
    category: 'PASSENGER',
    status: 'ON_SITE',
    address_line: 'B-204, Green Park Society, Wakad',
    pincode: '411057',
    city: 'PCMC',
    slot_at: slot(-1),
    price: money(799),
    inspector_assigned: true,
    valuation_id: null,
    inspection_id: 'insp_mock_m2',
    fee_paid: false,
    created_at: at(-50 * HOUR),
    inspector_id: 'usr_inspector',
  },
];

const walk = ['WALK_FRONT', 'WALK_FRONT_LEFT', 'WALK_LEFT', 'WALK_REAR_LEFT', 'WALK_REAR', 'WALK_REAR_RIGHT', 'WALK_RIGHT', 'WALK_FRONT_RIGHT'];
const M2 = ['M1', 'M2', 'M3', 'M4', 'M5'];
const NOT_SELF = ['M2', 'M3', 'M4', 'M5']; // inspector-only items (not in the M1 self-inspection)
const item = (code, label, extra = {}) => ({
  item_code: code,
  label,
  group_code: code[0],
  answer_type: 'STATE',
  applicable_modes: M2,
  gate: false,
  scored: true,
  mandatory: false,
  dynamic: false,
  ...extra,
});

// GET /checklists/PASSENGER?version=2 (checklist). Mode scoping as the
// backend's: Q1 / C1 / P2 are inspector-only, O2 is self-inspection only.
export const sampleChecklist = () => ({
  schema_version: 2,
  category: 'PASSENGER',
  applicable_modes: M2,
  required_documents: ['RC', 'INSURANCE', 'PUC'],
  sections: [
    { group_code: 'A', label: 'Identity', items: [item('A1', 'VIN/chassis plate matches RC', { mandatory: true, gate: true, scored: false })] },
    {
      group_code: 'P',
      label: 'Documents',
      items: [
        item('P1', 'RC present and legible', { mandatory: true, gate: true }),
        item('P2', 'RC document (photo or scan)', {
          mandatory: true,
          gate: true,
          applicable_modes: ['M2'],
          evidence_requirement: { kinds: ['DOCUMENT'], min_count: 1, shot_codes: ['RC_FRONT'], severity_escalation: false },
        }),
        item('P3', 'Insurance policy', {
          gate: true,
          evidence_requirement: { kinds: ['DOCUMENT'], min_count: 1, shot_codes: ['INSURANCE_POLICY'], severity_escalation: false },
        }),
      ],
    },
    {
      group_code: 'Q',
      label: 'Legal',
      items: [item('Q1', 'No active theft/blacklist marker', { mandatory: true, gate: true, applicable_modes: NOT_SELF })],
    },
    {
      group_code: 'O',
      label: 'Usage',
      items: [
        item('O1', 'Odometer reading (km)', { mandatory: true, answer_type: 'NUMERIC', scored: false }),
        item('O2', 'Number of previous owners', {
          mandatory: true,
          answer_type: 'NUMERIC',
          scored: false,
          applicable_modes: ['M1'],
        }),
      ],
    },
    {
      group_code: 'B',
      label: 'Exterior',
      items: [
        item('B1', 'Body panel condition', {
          mandatory: true,
          evidence_requirement: { kinds: ['PHOTO'], min_count: 1, shot_codes: walk, severity_escalation: true },
        }),
        item('B2', 'Paint uniformity'),
        item('XM1', 'Guided photos', { applicable_modes: ['M1'], gate: true, scored: false }),
        item('XM2', 'Guided photos', { applicable_modes: ['M2'], gate: true, scored: false }),
      ],
    },
    {
      group_code: 'C',
      label: 'Structural',
      items: [item('C1', 'Chassis / underbody integrity', { mandatory: true, applicable_modes: NOT_SELF })],
    },
    {
      group_code: 'D',
      label: 'Engine',
      items: [
        item('D1', 'Engine bay condition (static)', {
          evidence_requirement: { kinds: ['PHOTO'], min_count: 0, shot_codes: ['ENG_BATTERY', 'ENG_OIL_CAP'], severity_escalation: false },
        }),
        item('D2', 'Engine runs smoothly', { dynamic: true }),
      ],
    },
    { group_code: 'H', label: 'Tyres', items: [item('H1', 'Tyre tread depth', { answer_type: 'NUMERIC' })] },
  ],
});

// GET /inspections/insp_mock_m2 (inspection) - started, two answers saved.
export const sampleInspection = () => ({
  id: 'insp_mock_m2',
  vehicle_id: 'veh_mock_m2',
  mode: 'M2',
  category: 'PASSENGER',
  status: 'IN_PROGRESS',
  checklist_version: 2,
  items: [
    { item_code: 'A1', group_code: 'A', severity: 'OK', numeric_value: null, unit: null, text_note: null, na_reason: null, refurb_cost_minor: null, evidence_ref_ids: [], answered_at: at(-HOUR) },
    { item_code: 'P1', group_code: 'P', severity: 'OK', numeric_value: null, unit: null, text_note: null, na_reason: null, refurb_cost_minor: null, evidence_ref_ids: [], answered_at: at(-HOUR) },
  ],
  evidence_refs: [],
  created_at: at(-HOUR),
  submitted_at: null,
  vehicle: { make: 'Hyundai', model: 'Creta', variant: 'SX', mfg_year: 2022, category: 'PASSENGER', fuel: 'DIESEL' },
});
