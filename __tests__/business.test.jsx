/**
 * Business accounts (as the web's /dealer, /institutional and
 * /institutional/import): the API calls against a fake backend (fetch is
 * mocked) and the screens' main states.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Badge, Button, ChipTabs, TextField } from '../src/components';
import ConfirmDialog from '../src/components/feedback/ConfirmDialog';
import * as api from '../src/api/services/business.api';
import { endSession, startSession } from '../src/api/session';
import { clearUser, setUser } from '../src/store/userStore';
import useMyOrganizations, { clearMyOrganizations } from '../src/hooks/useMyOrganizations';
import BusinessHome from '../src/screens/business/BusinessHome/BusinessHome';
import DealerPortal from '../src/screens/business/DealerPortal/DealerPortal';
import DealerCreateListing from '../src/screens/business/DealerCreateListing/DealerCreateListing';
import InstitutionalPortal from '../src/screens/business/InstitutionalPortal/InstitutionalPortal';
import IntakeDetail from '../src/screens/business/IntakeDetail/IntakeDetail';
import PlacementDetail from '../src/screens/business/PlacementDetail/PlacementDetail';
import BulkImport from '../src/screens/business/BulkImport/BulkImport';
import ImportJob from '../src/screens/business/ImportJob/ImportJob';
import FilterChips from '../src/screens/business/components/FilterChips';
import RowCard from '../src/screens/business/components/RowCard';
import MetricTile from '../src/screens/business/ImportJob/components/MetricTile';
import { BUSINESS_ROUTES } from '../src/screens/business/routes';

// Pages reload when they come back into view; here, once after mounting.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

// Reading the picked CSV's text.
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: { fs: { readFile: jest.fn(() => Promise.resolve('Reg#,Asset\nDL10AB6384,HONDA GRAZIA\n')) } },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// --- fake backend ----------------------------------------------------------------

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});

// routes: { 'GET /me/organizations': body | [status, body] | (url, init) => ... }
// Matched on method + path (query string ignored); unknown calls are 404.
const serve = routes => {
  global.fetch = jest.fn((url, init = {}) => {
    const path = url.replace(/^.*\/api\/v1/, '').split('?')[0];
    const route = routes[`${init.method ?? 'GET'} ${path}`];
    if (route === undefined) {
      return Promise.resolve(reply(404, { error: { code: 'NOT_FOUND', message: 'Not found' } }));
    }
    const value = typeof route === 'function' ? route(url, init) : route;
    return Promise.resolve(Array.isArray(value) ? reply(value[0], value[1]) : reply(200, value));
  });
};
const calls = (method, pathPart) =>
  fetch.mock.calls.filter(([url, init = {}]) => (init.method ?? 'GET') === method && url.includes(pathPart));

const membership = (extra = {}) => ({
  membership_id: 'mem_1',
  org_id: 'org_dealer',
  org_legal_name: 'Pune Motors Pvt Ltd',
  org_type: 'DEALER',
  org_status: 'ACTIVE',
  role: 'ADMIN',
  ...extra,
});
const dealerListing = (extra = {}) => ({
  id: 'lst_dealer_000001',
  vehicle_id: 'veh_1',
  status: 'PENDING_REVIEW',
  ask_price_minor: 55000000,
  currency: 'INR',
  city: 'PUNE',
  channel: 'INSTITUTIONAL',
  created_at: '2026-10-01T10:00:00Z',
  published_at: null,
  ...extra,
});
const stock = (extra = {}) => ({
  listing_id: 'lst_other_1',
  make: 'Maruti',
  model: 'Swift',
  variant: 'VXI',
  mfg_year: 2019,
  fuel: 'PETROL',
  category: 'PASSENGER',
  city: 'PCMC',
  ask_price_minor: 42000000,
  currency: 'INR',
  grade: 'B',
  status: 'LIVE',
  published_at: '2026-10-02T10:00:00Z',
  ...extra,
});
const portfolioItem = (id, extra = {}) => ({
  asset_id: id,
  kind: 'LISTING',
  vehicle: { make: 'Tata', model: 'Nexon', mfg_year: 2021, fuel: 'DIESEL', category: 'PASSENGER', chassis_last6: 'A12345' },
  status: 'LIVE',
  ageing_days: 12,
  ageing_bucket: 'FRESH',
  location: 'PUNE',
  valuation: { band: 'B' },
  channel: 'INSTITUTIONAL',
  created_at: '2026-10-01T10:00:00Z',
  ...extra,
});
const intakeView = (extra = {}) => ({
  intake_id: 'int_1',
  org_id: 'org_bank',
  vehicle_id: 'veh_9',
  m3_inspection_id: null,
  authority_doc_id: 'doc_auth',
  yard_placement_id: 'plc_1',
  status: 'IN_YARD',
  documents: [
    { document_id: 'doc_auth', doc_type: 'SARFAESI_AUTHORITY', valid_from: null, valid_until: null, verified_at: '2026-10-02T00:00:00Z', created_at: '2026-10-01T00:00:00Z' },
  ],
  possession_items: [{ item_id: 'pi_1', label: 'Spare key', media_id: null, note: 'With bank', created_at: '2026-10-01T00:00:00Z' }],
  created_at: '2026-10-01T10:00:00Z',
  ...extra,
});
const placementView = (extra = {}) => ({
  placement_id: 'plc_1',
  org_id: 'org_bank',
  intake_id: 'int_1',
  vehicle_id: 'veh_9',
  yard_code: 'PUNE-Y1',
  bay_code: 'B07',
  status: 'MOVED',
  storage_days: 9,
  placed_at: '2026-10-05T10:00:00Z',
  released_at: null,
  movements: [{ movement_id: 'mv_1', from_bay: 'B01', to_bay: 'B07', reason: 'Reshuffle', moved_at: '2026-10-08T10:00:00Z' }],
  created_at: '2026-10-05T10:00:00Z',
  ...extra,
});
const importJob = (extra = {}) => ({
  import_id: 'imp_1',
  status: 'PARTIALLY_COMPLETED',
  filename: 'repo-oct.csv',
  total_rows: 3,
  created_count: 1,
  failed_count: 1,
  skipped_count: 1,
  error_summary: '1 row failed validation',
  created_at: '2026-10-10T10:00:00Z',
  submitted_at: '2026-10-10T10:00:00Z',
  completed_at: '2026-10-10T10:00:05Z',
  ...extra,
});
const importRows = [
  { row_number: 1, status: 'CREATED', reg_number: 'DL10AB6384', intake_id: 'int_77', vehicle_id: 'veh_77', error_code: null, error_detail: null },
  { row_number: 2, status: 'SKIPPED_DUPLICATE', reg_number: 'MH12XY0001', intake_id: null, vehicle_id: null, error_code: 'DUPLICATE', error_detail: 'Already registered' },
  { row_number: 3, status: 'FAILED', reg_number: null, intake_id: null, vehicle_id: null, error_code: 'FUEL_MISSING', error_detail: 'Fuel is required' },
];

const dealerOrg = { id: 'org_dealer', name: 'Pune Motors Pvt Ltd', type: 'DEALER', status: 'ACTIVE', role: 'ADMIN', active: true, portal: 'DEALER' };
const bankOrg = { id: 'org_bank', name: 'Sahyadri Bank', type: 'LENDER', status: 'ACTIVE', role: 'MEMBER', active: true, portal: 'INSTITUTIONAL' };

// --- render helpers ------------------------------------------------------------------

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  await flush();
  return tree.root;
};
const flush = async (ms = 300) => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
  }
};
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() });
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const field = (root, label) => root.findAllByType(TextField).find(f => f.props.label === label);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const cards = root => root.findAllByType(RowCard);
const badges = root => root.findAllByType(Badge).map(b => b.props.label);
const press = async (onPress, ...args) => {
  await act(async () => {
    onPress(...args);
  });
  await flush();
};

beforeEach(async () => {
  serve({});
  await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  jest.useFakeTimers();
});
afterEach(async () => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
  await endSession();
  clearMyOrganizations();
  clearUser();
  jest.restoreAllMocks();
});

// --- API --------------------------------------------------------------------------------

describe('business API', () => {
  test('GET /me/organizations, signed in, mapped', async () => {
    serve({ 'GET /me/organizations': { items: [membership(), membership({ membership_id: 'mem_2', org_id: 'org_bank', org_type: 'LENDER', org_status: 'PENDING' })], request_id: 'r' } });
    const orgs = await api.getMyOrganizations();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/me\/organizations$/);
    expect(init.headers.Authorization).toBe('Bearer access-1');
    expect(orgs).toEqual([
      expect.objectContaining({ id: 'org_dealer', name: 'Pune Motors Pvt Ltd', type: 'DEALER', active: true, portal: 'DEALER' }),
      expect.objectContaining({ id: 'org_bank', type: 'LENDER', status: 'PENDING', active: false, portal: 'INSTITUTIONAL' }),
    ]);
  });

  test('dealer: list, create (the web body, rupees -> paise), withdraw, browse filters', async () => {
    serve({
      'GET /dealer/orgs/org_dealer/listings': { listings: [dealerListing()], request_id: 'r' },
      'POST /dealer/orgs/org_dealer/listings': [201, { listing: dealerListing({ id: 'lst_new' }), request_id: 'r' }],
      'POST /dealer/orgs/org_dealer/listings/lst_new/withdraw': { listing: dealerListing({ id: 'lst_new', status: 'WITHDRAWN' }), request_id: 'r' },
      'GET /dealer/listings': { listings: [stock()], request_id: 'r' },
    });

    const list = await api.getDealerListings('org_dealer');
    expect(list[0]).toEqual(expect.objectContaining({ id: 'lst_dealer_000001', askPrice: 550000, city: 'PUNE', canWithdraw: true }));

    const created = await api.createDealerListing('org_dealer', {
      category: 'TWO_WHEELER',
      make: ' Honda ',
      model: 'Activa ',
      year: '2020',
      fuel: 'PETROL',
      askPrice: '65000',
      city: '',
    });
    expect(JSON.parse(calls('POST', '/dealer/orgs/org_dealer/listings')[0][1].body)).toEqual({
      vehicle: { category: 'TWO_WHEELER', make: 'Honda', model: 'Activa', mfg_year: 2020, fuel: 'PETROL' },
      ask_price_minor: 6500000,
      city: null,
    });
    expect(created.id).toBe('lst_new');

    const withdrawn = await api.withdrawDealerListing('org_dealer', 'lst_new');
    expect(withdrawn).toEqual(expect.objectContaining({ status: 'WITHDRAWN', canWithdraw: false }));

    const found = await api.browseDealerStock({ category: 'PASSENGER', fuel: '', priceMax: 800000 });
    expect(calls('GET', '/dealer/listings')[0][0]).toMatch(/\/dealer\/listings\?category=PASSENGER&price_max=80000000$/);
    expect(found[0]).toEqual(expect.objectContaining({ id: 'lst_other_1', make: 'Maruti', year: 2019, askPrice: 420000, grade: 'B' }));
  });

  test('institutional reads: portfolio filters + cursor, intake / yard lists and details', async () => {
    serve({
      'GET /orgs/org_bank/portfolio': { data: [portfolioItem('a1')], next_cursor: 'c2', request_id: 'r' },
      'GET /orgs/org_bank/intake': { intake: [{ intake_id: 'int_1', vehicle_id: null, status: 'REGISTERED', created_at: '2026-10-01T00:00:00Z' }], request_id: 'r' },
      'GET /orgs/org_bank/intake/int_1': { intake: intakeView(), request_id: 'r' },
      'GET /orgs/org_bank/yard': { placements: [{ placement_id: 'plc_1', vehicle_id: 'veh_9', yard_code: 'PUNE-Y1', bay_code: null, status: 'PLACED', storage_days: 3, placed_at: '2026-10-05T00:00:00Z' }], request_id: 'r' },
      'GET /orgs/org_bank/yard/plc_1': { placement: placementView(), request_id: 'r' },
    });

    const page = await api.getPortfolio('org_bank', { status: 'LIVE', category: '', ageingBucket: 'FRESH', location: 'PUNE', cursor: 'c1' });
    expect(fetch.mock.calls[0][0]).toMatch(/\/orgs\/org_bank\/portfolio\?status=LIVE&location=PUNE&ageing_bucket=FRESH&cursor=c1$/);
    expect(page.nextCursor).toBe('c2');
    expect(page.items[0]).toEqual(expect.objectContaining({ id: 'a1', ageingBucket: 'FRESH', ageingDays: 12, valuationBand: 'B' }));

    expect((await api.getIntakeList('org_bank'))[0]).toEqual(expect.objectContaining({ id: 'int_1', status: 'REGISTERED' }));
    const intake = await api.getIntake('org_bank', 'int_1');
    expect(intake).toEqual(expect.objectContaining({ id: 'int_1', placementId: 'plc_1', authorityDocId: 'doc_auth' }));
    expect(intake.documents[0].type).toBe('SARFAESI_AUTHORITY');
    expect((await api.getYard('org_bank'))[0]).toEqual(expect.objectContaining({ id: 'plc_1', yardCode: 'PUNE-Y1', storageDays: 3 }));
    const placement = await api.getPlacement('org_bank', 'plc_1');
    expect(placement.movements[0]).toEqual(expect.objectContaining({ fromBay: 'B01', toBay: 'B07', reason: 'Reshuffle' }));
  });

  test('a non-member (404) / inactive org (409) get clear codes', async () => {
    serve({
      'GET /orgs/org_x/intake': [404, { error: { code: 'NOT_FOUND', message: 'nope' } }],
      'GET /orgs/org_y/intake': [409, { error: { code: 'ORG_NOT_ACTIVE', message: 'nope' } }],
    });
    await expect(api.getIntakeList('org_x')).rejects.toMatchObject({ code: api.ORG_NO_ACCESS });
    await expect(api.getIntakeList('org_y')).rejects.toMatchObject({ code: api.ORG_NOT_ACTIVE, message: 'That organization is not active.' });
  });

  test('CSV import: inline csv + SARFAESI authority key; rows paged; feature-off message', async () => {
    serve({
      'POST /orgs/org_bank/intake-imports': [201, { import: importJob(), request_id: 'r' }],
      'GET /orgs/org_bank/intake-imports': { imports: [importJob()], request_id: 'r' },
      'GET /orgs/org_bank/intake-imports/imp_1/rows': { rows: importRows, next_cursor: null, request_id: 'r' },
    });
    const job = await api.createIntakeImport('org_bank', {
      filename: 'repo-oct.csv',
      csvContent: 'Reg#,Asset\nDL10AB6384,HONDA\n',
      authorityKey: '  intake-imports/org_bank/auth.pdf ',
    });
    expect(JSON.parse(calls('POST', '/intake-imports')[0][1].body)).toEqual({
      filename: 'repo-oct.csv',
      csv_content: 'Reg#,Asset\nDL10AB6384,HONDA\n',
      authority: { doc_type: 'SARFAESI_AUTHORITY', s3_key: 'intake-imports/org_bank/auth.pdf' },
    });
    expect(job).toEqual(expect.objectContaining({ id: 'imp_1', totalRows: 3, createdCount: 1, skippedCount: 1, failedCount: 1 }));
    expect((await api.getIntakeImports('org_bank'))[0].id).toBe('imp_1');
    const { rows, nextCursor } = await api.getIntakeImportRows('org_bank', 'imp_1');
    expect(calls('GET', '/rows')[0][0]).toMatch(/\/intake-imports\/imp_1\/rows\?limit=200$/);
    expect(rows.map(r => r.status)).toEqual(['CREATED', 'SKIPPED_DUPLICATE', 'FAILED']);
    expect(nextCursor).toBeNull();

    serve({ 'POST /orgs/org_bank/intake-imports': [503, { error: { code: 'LENDER_INTAKE_UNAVAILABLE', message: 'off' } }] });
    await expect(
      api.createIntakeImport('org_bank', { filename: 'a.csv', csvContent: 'x', authorityKey: 'k' }),
    ).rejects.toMatchObject({ message: 'Bulk intake is not enabled in this environment yet.' });
  });
});

// --- useMyOrganizations ------------------------------------------------------------------

describe('useMyOrganizations', () => {
  const Probe = ({ onState }) => {
    onState(useMyOrganizations());
    return null;
  };

  test('signed in: loads the orgs once; signed out: none', async () => {
    serve({ 'GET /me/organizations': { items: [membership()], request_id: 'r' } });
    const states = [];
    setUser({ id: 'u1' });
    await render(<Probe onState={s => states.push(s)} />);
    expect(states[0]).toEqual({ orgs: [], loading: true });
    expect(states.at(-1)).toEqual({ orgs: [expect.objectContaining({ id: 'org_dealer' })], loading: false });
    expect(calls('GET', '/me/organizations')).toHaveLength(1);

    act(() => clearUser());
    expect(states.at(-1)).toEqual({ orgs: [], loading: false });
  });

  test('a failed load counts as no orgs', async () => {
    serve({ 'GET /me/organizations': [500, {}] });
    const states = [];
    setUser({ id: 'u1' });
    await render(<Probe onState={s => states.push(s)} />);
    expect(states.at(-1)).toEqual({ orgs: [], loading: false });
  });
});

// --- Screens --------------------------------------------------------------------------------

describe('Business home', () => {
  test('lists the orgs; a dealer org opens the dealer portal, a lender the institutional one; inactive can’t open', async () => {
    serve({
      'GET /me/organizations': {
        items: [
          membership(),
          membership({ membership_id: 'mem_2', org_id: 'org_bank', org_legal_name: 'Sahyadri Bank', org_type: 'LENDER', role: 'MEMBER' }),
          membership({ membership_id: 'mem_3', org_id: 'org_yard', org_legal_name: 'Wakad Yard', org_type: 'YARD', org_status: 'PENDING' }),
        ],
        request_id: 'r',
      },
    });
    const navigation = nav();
    const root = await render(<BusinessHome navigation={navigation} />);
    const rows = cards(root);
    expect(rows.map(r => r.props.title)).toEqual(['Pune Motors Pvt Ltd', 'Sahyadri Bank', 'Wakad Yard']);
    expect(badges(root)).toEqual(['Active', 'Active', 'Pending']);
    expect(hasText(root, 'Dealer · Admin')).toBe(true);
    expect(hasText(root, 'This organization is not active yet.')).toBe(true);
    expect(rows[2].props.onPress).toBeUndefined();

    await press(rows[0].props.onPress);
    expect(navigation.navigate).toHaveBeenCalledWith(BUSINESS_ROUTES.DEALER, { org: expect.objectContaining({ id: 'org_dealer' }) });
    await press(rows[1].props.onPress);
    expect(navigation.navigate).toHaveBeenCalledWith(BUSINESS_ROUTES.INSTITUTIONAL, { org: expect.objectContaining({ id: 'org_bank' }) });
  });

  test('empty and error states', async () => {
    serve({ 'GET /me/organizations': { items: [], request_id: 'r' } });
    let root = await render(<BusinessHome navigation={nav()} />);
    expect(hasText(root, 'No organization')).toBe(true);
    act(() => tree.unmount());

    serve({ 'GET /me/organizations': [500, {}] });
    root = await render(<BusinessHome navigation={nav()} />);
    expect(hasText(root, "We couldn't load your organizations")).toBe(true);
    expect(button(root, 'Try again')).toBeDefined();
  });
});

describe('Dealer portal', () => {
  test('my listings with status; withdraw asks first, then shows it withdrawn', async () => {
    serve({
      'GET /dealer/orgs/org_dealer/listings': { listings: [dealerListing(), dealerListing({ id: 'lst_sold', status: 'SOLD' })], request_id: 'r' },
      'POST /dealer/orgs/org_dealer/listings/lst_dealer_000001/withdraw': { listing: dealerListing({ status: 'WITHDRAWN' }), request_id: 'r' },
    });
    const navigation = nav();
    const root = await render(<DealerPortal navigation={navigation} route={{ params: { org: dealerOrg } }} />);
    expect(hasText(root, 'Pune Motors Pvt Ltd')).toBe(true);
    expect(badges(root)).toEqual(expect.arrayContaining(['In review', 'Sold']));
    expect(hasText(root, '₹5,50,000')).toBe(true);
    // Only the in-review one can be withdrawn.
    expect(root.findAllByType(Button).filter(b => b.props.title === 'Withdraw')).toHaveLength(1);

    await press(button(root, 'Withdraw').props.onPress);
    const dialog = root.findAllByType(ConfirmDialog).find(d => d.props.visible);
    expect(dialog.props.title).toBe('Withdraw this listing?');
    expect(calls('POST', '/withdraw')).toHaveLength(0);
    await press(dialog.props.onConfirm);
    expect(calls('POST', '/withdraw')).toHaveLength(1);
    expect(badges(root)).toEqual(expect.arrayContaining(['Withdrawn', 'Sold']));
    expect(button(root, 'Withdraw')).toBeUndefined();

    await press(button(root, 'List a vehicle').props.onPress);
    expect(navigation.navigate).toHaveBeenCalledWith(BUSINESS_ROUTES.DEALER_CREATE, { org: dealerOrg });
  });

  test('browse dealer stock: filters re-query; empty message', async () => {
    serve({
      'GET /dealer/orgs/org_dealer/listings': { listings: [], request_id: 'r' },
      'GET /dealer/listings': url => ({ listings: url.includes('fuel=DIESEL') ? [] : [stock()], request_id: 'r' }),
    });
    const root = await render(<DealerPortal navigation={nav()} route={{ params: { org: dealerOrg } }} />);
    expect(hasText(root, 'No listings yet')).toBe(true);

    await press(root.findByType(ChipTabs).props.onChange, 'browse');
    expect(cards(root)[0].props.title).toBe('Maruti Swift VXI · 2019');
    expect(hasText(root, '₹4,20,000')).toBe(true);
    expect(button(root, 'List a vehicle')).toBeUndefined();

    await press(root.findByType(FilterChips).props.onChange, 'fuel', 'DIESEL');
    expect(calls('GET', '/dealer/listings?fuel=DIESEL')).toHaveLength(1);
    expect(hasText(root, 'No approved dealer listings match your filters.')).toBe(true);
  });

  test('a 404 on the org shows the no-access message', async () => {
    serve({ 'GET /dealer/orgs/org_dealer/listings': [404, { error: { code: 'NOT_FOUND', message: 'x' } }] });
    const root = await render(<DealerPortal navigation={nav()} route={{ params: { org: dealerOrg } }} />);
    expect(hasText(root, 'Your account does not have access to this organization.')).toBe(true);
  });
});

describe('Dealer: list a vehicle', () => {
  test('checks like the web, then creates and goes back', async () => {
    serve({ 'POST /dealer/orgs/org_dealer/listings': [201, { listing: dealerListing({ id: 'lst_new' }), request_id: 'r' }] });
    const navigation = nav();
    const root = await render(<DealerCreateListing navigation={navigation} route={{ params: { org: dealerOrg } }} />);

    await press(button(root, 'Submit for review').props.onPress);
    expect(hasText(root, 'Enter the make and model.')).toBe(true);
    await act(async () => field(root, 'Make').props.onChangeText('Maruti'));
    await act(async () => field(root, 'Model').props.onChangeText('Swift'));
    await act(async () => field(root, 'Year').props.onChangeText('19x'));
    await press(button(root, 'Submit for review').props.onPress);
    expect(hasText(root, 'Enter a valid manufacturing year.')).toBe(true);
    await act(async () => field(root, 'Year').props.onChangeText('2019'));
    await press(button(root, 'Submit for review').props.onPress);
    expect(hasText(root, 'Enter a valid asking price.')).toBe(true);
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => field(root, 'Ask price (₹)').props.onChangeText('5,50,000'));
    expect(field(root, 'Ask price (₹)').props.value).toBe('5,50,000');
    await press(button(root, 'Submit for review').props.onPress);
    expect(JSON.parse(calls('POST', '/listings')[0][1].body)).toEqual({
      vehicle: { category: 'PASSENGER', make: 'Maruti', model: 'Swift', mfg_year: 2019, fuel: 'PETROL' },
      ask_price_minor: 55000000,
      city: null,
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });
});

describe('Institutional portal', () => {
  test('portfolio: rows, filter re-query, load more', async () => {
    serve({
      'GET /orgs/org_bank/portfolio': url =>
        url.includes('cursor=c2')
          ? { data: [portfolioItem('a2', { status: 'RESERVED', ageing_bucket: 'STALE' })], next_cursor: null, request_id: 'r' }
          : { data: [portfolioItem('a1')], next_cursor: 'c2', request_id: 'r' },
    });
    const root = await render(<InstitutionalPortal navigation={nav()} route={{ params: { org: bankOrg } }} />);
    expect(cards(root).map(c => c.props.title)).toEqual(['Tata Nexon · 2021']);
    expect(hasText(root, 'Valuation band: B')).toBe(true);

    await press(button(root, 'Load more').props.onPress);
    expect(cards(root)).toHaveLength(2);
    expect(button(root, 'Load more')).toBeUndefined();

    await press(root.findByType(FilterChips).props.onChange, 'status', 'LIVE');
    expect(calls('GET', '/portfolio?status=LIVE')).toHaveLength(1);
    expect(cards(root)).toHaveLength(1);
  });

  test('intake and yard tabs open their details; imports tab lists jobs and starts a new one', async () => {
    serve({
      'GET /orgs/org_bank/portfolio': { data: [], next_cursor: null, request_id: 'r' },
      'GET /orgs/org_bank/intake': { intake: [{ intake_id: 'int_1', vehicle_id: 'veh_9', status: 'IN_YARD', created_at: '2026-10-01T00:00:00Z' }], request_id: 'r' },
      'GET /orgs/org_bank/yard': { placements: [{ placement_id: 'plc_1', vehicle_id: 'veh_9', yard_code: 'PUNE-Y1', bay_code: 'B07', status: 'PLACED', storage_days: 4, placed_at: '2026-10-05T00:00:00Z' }], request_id: 'r' },
      'GET /orgs/org_bank/intake-imports': { imports: [importJob()], request_id: 'r' },
    });
    const navigation = nav();
    const root = await render(<InstitutionalPortal navigation={navigation} route={{ params: { org: bankOrg } }} />);
    expect(hasText(root, 'No assets')).toBe(true);
    expect(calls('GET', '/intake')).toHaveLength(0); // loads when opened

    await press(root.findByType(ChipTabs).props.onChange, 'intake');
    expect(badges(root)).toContain('In yard');
    await press(cards(root)[0].props.onPress);
    expect(navigation.navigate).toHaveBeenCalledWith(BUSINESS_ROUTES.INTAKE_DETAIL, { orgId: 'org_bank', intakeId: 'int_1' });

    await press(root.findByType(ChipTabs).props.onChange, 'yard');
    expect(cards(root)[0].props.title).toBe('PUNE-Y1 · B07');
    await press(cards(root)[0].props.onPress);
    expect(navigation.navigate).toHaveBeenCalledWith(BUSINESS_ROUTES.PLACEMENT_DETAIL, { orgId: 'org_bank', placementId: 'plc_1' });

    await press(root.findByType(ChipTabs).props.onChange, 'imports');
    expect(cards(root)[0].props.title).toBe('repo-oct.csv');
    expect(hasText(root, '3 uploaded · 1 registered · 1 duplicate · 1 invalid')).toBe(true);
    await press(button(root, 'New bulk import').props.onPress);
    expect(navigation.navigate).toHaveBeenCalledWith(BUSINESS_ROUTES.BULK_IMPORT, { org: bankOrg });
  });

  test('intake detail and placement detail (read-only)', async () => {
    serve({
      'GET /orgs/org_bank/intake/int_1': { intake: intakeView(), request_id: 'r' },
      'GET /orgs/org_bank/yard/plc_1': { placement: placementView(), request_id: 'r' },
    });
    const navigation = nav();
    let root = await render(<IntakeDetail navigation={navigation} route={{ params: { orgId: 'org_bank', intakeId: 'int_1' } }} />);
    expect(hasText(root, 'SARFAESI authority')).toBe(true);
    expect(hasText(root, 'Spare key')).toBe(true);
    expect(badges(root)).toEqual(expect.arrayContaining(['In yard', 'Verified']));
    await press(button(root, 'View yard placement').props.onPress);
    expect(navigation.navigate).toHaveBeenCalledWith(BUSINESS_ROUTES.PLACEMENT_DETAIL, { orgId: 'org_bank', placementId: 'plc_1' });
    act(() => tree.unmount());

    root = await render(<PlacementDetail navigation={nav()} route={{ params: { orgId: 'org_bank', placementId: 'plc_1' } }} />);
    expect(hasText(root, 'PUNE-Y1')).toBe(true);
    expect(hasText(root, 'Bay B01 to B07')).toBe(true);
    expect(badges(root)).toContain('Moved');
  });
});

describe('Bulk import', () => {
  const picker = () => require('@react-native-documents/picker');

  test('needs a CSV and the authority key; uploads the file text; opens the results', async () => {
    serve({ 'POST /orgs/org_bank/intake-imports': [201, { import: importJob(), request_id: 'r' }] });
    const navigation = nav();
    const root = await render(<BulkImport navigation={navigation} route={{ params: { org: bankOrg } }} />);

    await press(button(root, 'Import').props.onPress);
    expect(hasText(root, 'Choose a CSV file to upload.')).toBe(true);

    // A PDF is refused.
    await press(button(root, 'Choose').props.onPress);
    expect(hasText(root, 'Choose a .csv file.')).toBe(true);

    picker().pick.mockResolvedValueOnce([{ uri: 'content://mock/repo-oct.csv', name: 'repo-oct.csv', type: 'text/csv', size: 2048 }]);
    await press(button(root, 'Choose').props.onPress);
    expect(hasText(root, 'repo-oct.csv · 2 KB')).toBe(true);

    await press(button(root, 'Import').props.onPress);
    expect(hasText(root, 'Enter the SARFAESI authority document key for this lot.')).toBe(true);
    await act(async () => field(root, 'SARFAESI authority document key (batch)').props.onChangeText('intake-imports/org_bank/a.pdf'));
    await press(button(root, 'Import').props.onPress);

    expect(JSON.parse(calls('POST', '/intake-imports')[0][1].body)).toEqual({
      filename: 'repo-oct.csv',
      csv_content: 'Reg#,Asset\nDL10AB6384,HONDA GRAZIA\n',
      authority: { doc_type: 'SARFAESI_AUTHORITY', s3_key: 'intake-imports/org_bank/a.pdf' },
    });
    expect(navigation.replace).toHaveBeenCalledWith(BUSINESS_ROUTES.IMPORT_JOB, {
      orgId: 'org_bank',
      importId: 'imp_1',
      job: expect.objectContaining({ id: 'imp_1' }),
    });
  });

  test('import results: counts and every row outcome', async () => {
    serve({
      'GET /orgs/org_bank/intake-imports/imp_1': { import: importJob(), request_id: 'r' },
      'GET /orgs/org_bank/intake-imports/imp_1/rows': { rows: importRows, next_cursor: null, request_id: 'r' },
    });
    const root = await render(<ImportJob navigation={nav()} route={{ params: { orgId: 'org_bank', importId: 'imp_1' } }} />);
    expect(root.findAllByType(MetricTile).map(m => [m.props.label, m.props.value])).toEqual([
      ['Uploaded', 3],
      ['Registered', 1],
      ['Duplicate', 1],
      ['Invalid', 1],
    ]);
    expect(hasText(root, '1 row failed validation')).toBe(true);
    expect(cards(root).map(c => c.props.title)).toEqual(['#1 · DL10AB6384', '#2 · MH12XY0001', '#3 · —']);
    expect(badges(root)).toEqual(expect.arrayContaining(['Partly completed', 'Registered', 'Duplicate', 'Failed']));
    expect(hasText(root, 'Fuel is required')).toBe(true);
  });
});
