/**
 * Marketplace screens + services against a fake backend (fetch is mocked).
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import { getMarketplaceVehicles, getVehicleDetails } from '../src/api/services/vehicle.api';
import Home from '../src/screens/home/Home/Home';
import VehicleListing from '../src/screens/marketplace/VehicleListing/VehicleListing';
import MakeOffer from '../src/screens/marketplace/MakeOffer/MakeOffer';
import { Button, Chip, ImageCarousel, TextField } from '../src/components';
import { clearSaved, isSaved, toggleSaved } from '../src/store/savedStore';

// Home refreshes the bell on focus; here, once after mounting.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

// A backend listing summary (GET /marketplace/listings item).
const summary = (id, extra = {}) => ({
  listing_id: id,
  make: 'Hyundai',
  model: 'Creta',
  variant: 'SX',
  mfg_year: 2022,
  fuel: 'DIESEL',
  category: 'PASSENGER',
  transmission: 'MANUAL',
  city: 'PUNE',
  ask_price: { amount_minor: 1150000_00, currency: 'INR' },
  grade: 'A_PLUS',
  coverage_pct: 92,
  verification_label: 'TURAG_VERIFIED',
  status: 'LIVE',
  fair_price: {
    ask_price: { amount_minor: 1150000_00, currency: 'INR' },
    estimate_low: { amount_minor: 1100000_00, currency: 'INR' },
    estimate_high: { amount_minor: 1200000_00, currency: 'INR' },
    assessment: 'FAIRLY_PRICED',
  },
  findings_summary: { major_count: 1, rectification_cost_minor: 0 },
  hero_photo_url: `https://cdn.example/${id}.jpg`,
  published_at: '2026-10-01T10:00:00Z',
  ...extra,
});

const detail = (id, extra = {}) => ({
  ...summary(id),
  report: {
    grade: 'A',
    overall_score: 82,
    score_breakdown: [{ group_code: 'ENG', group_label: 'Engine', score: 90 }],
    coverage_pct: 92,
    grade_not_ready: false,
    verification_label: 'TURAG_VERIFIED',
    turag_verified: true,
    mode: 'M2',
    valid_until: '2026-12-31T00:00:00Z',
    expired: false,
    findings: [
      { item_code: 'a', group: 'g', label: 'Dent', severity: 'MAJOR', rectification_cost_minor: null, photo_ref: null },
      { item_code: 'b', group: 'g', label: 'Scratch', severity: 'MINOR', rectification_cost_minor: null, photo_ref: null },
    ],
    documents: [],
    inspector_name: 'Isha',
    verification_token: null,
  },
  eligibility: { eligible: true, reason: null },
  photos: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
  photos_by_category: [],
  ...extra,
});

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};
const flush = async (rounds = 3) => {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
  }
};
const urlOf = call => call[0];
const calls = path => fetch.mock.calls.filter(c => urlOf(c).includes(path));
const bodyOf = call => JSON.parse(call[1].body);

beforeAll(() => {
  USE_REAL_API.marketplace = true;
});
afterAll(() => {
  USE_REAL_API.marketplace = false;
});
beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(async () => {
  act(() => tree?.unmount());
  tree = null;
  act(() => clearSaved());
  await endSession();
  jest.useRealTimers();
});

const signIn = () =>
  startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });

describe('marketplace service', () => {
  test('search sends the backend filters (no sign-in) and maps cards to rupees', async () => {
    fetch.mockResolvedValueOnce(reply(200, { data: [summary('lst_1')], next_cursor: 'c2' }));
    const result = await getMarketplaceVehicles({
      query: ' creta ',
      category: 'cars',
      filters: { city: 'PUNE', fuel: 'Diesel', grade_min: 'B' },
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/marketplace\/listings\?/);
    expect(url).toContain('q=creta');
    expect(url).toContain('category=PASSENGER');
    expect(url).toContain('city=PUNE');
    expect(url).toContain('fuel=Diesel');
    expect(url).toContain('grade_min=B');
    expect(url).toContain('limit=24');
    expect(url).not.toContain('cursor=');
    expect(init.headers.Authorization).toBeUndefined();

    expect(result.nextCursor).toBe('c2');
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'lst_1',
        name: 'Hyundai Creta',
        year: 2022,
        fuel: 'Diesel',
        price: 1150000,
        grade: 'A+',
        verified: true,
        category: 'cars',
        city: 'Pune',
        image: { uri: 'https://cdn.example/lst_1.jpg' },
      }),
    );
  });

  test('a listing with no approved photo has no image (shows the placeholder)', async () => {
    fetch.mockResolvedValueOnce(reply(200, { data: [summary('lst_1', { hero_photo_url: null })], next_cursor: null }));
    const { items } = await getMarketplaceVehicles();
    expect(items[0].image).toBeNull();
  });

  test('details map the report; a missing listing says it is no longer available', async () => {
    fetch.mockResolvedValueOnce(reply(200, { listing: detail('lst_1') }));
    const vehicle = await getVehicleDetails('lst_1');
    expect(vehicle).toEqual(
      expect.objectContaining({
        images: [{ uri: 'https://cdn.example/1.jpg' }, { uri: 'https://cdn.example/2.jpg' }],
        inspection: 'TURAG Verified',
        fairPrice: expect.objectContaining({ low: 1100000, high: 1200000, label: 'Fairly priced' }),
        report: expect.objectContaining({ score: 8.2, grade: 'A', issues: 1, inspectorName: 'Isha' }),
        description: null,
      }),
    );

    expect(vehicle.photoGroups).toEqual([]); // no categories -> flat gallery

    fetch.mockResolvedValueOnce(reply(404, { error: { code: 'NOT_FOUND', message: 'Not found' } }));
    await expect(getVehicleDetails('gone')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'This vehicle is no longer available.',
    });
  });
});

describe('Vehicle page photo tabs', () => {
  const categorised = detail('lst_1', {
    photos_by_category: [
      { category: 'TYRE', url: 'https://cdn.example/t1.jpg' },
      { category: 'EXTERIOR', url: 'https://cdn.example/e1.jpg' },
      { category: 'EXTERIOR', url: 'https://cdn.example/e2.jpg' },
      { category: 'ENGINE', url: 'https://cdn.example/g1.jpg' },
    ],
  });

  test('photos are grouped by category in the fixed web order (empty ones dropped)', async () => {
    fetch.mockResolvedValueOnce(reply(200, { listing: categorised }));
    const vehicle = await getVehicleDetails('lst_1');
    expect(vehicle.photoGroups).toEqual([
      { category: 'EXTERIOR', images: [{ uri: 'https://cdn.example/e1.jpg' }, { uri: 'https://cdn.example/e2.jpg' }] },
      { category: 'ENGINE', images: [{ uri: 'https://cdn.example/g1.jpg' }] },
      { category: 'TYRE', images: [{ uri: 'https://cdn.example/t1.jpg' }] },
    ]);
  });

  test('tabs show each category with its count; tapping one switches the gallery', async () => {
    fetch.mockResolvedValue(reply(200, { listing: categorised }));
    const root = await render(
      <VehicleListing
        navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
        route={{ params: { vehicle: { id: 'lst_1', name: 'Hyundai Creta' } } }}
      />,
    );
    await act(async () => {});

    const tabs = root.findAllByType(Chip);
    expect(tabs.map(c => `${c.props.label} ${c.props.count}`)).toEqual(['Exterior 2', 'Engine 1', 'Tyres 1']);
    expect(tabs[0].props.selected).toBe(true);
    expect(root.findByType(ImageCarousel).props.images).toHaveLength(2);

    await act(async () => tabs[2].props.onPress());
    expect(root.findAllByType(Chip)[2].props.selected).toBe(true);
    expect(root.findByType(ImageCarousel).props.images).toEqual([{ uri: 'https://cdn.example/t1.jpg' }]);
    fetch.mockReset();
  });
});

describe('Home grid', () => {
  test('loads more vehicles when scrolled to the end, using the cursor', async () => {
    jest.useFakeTimers();
    const page1 = Array.from({ length: 24 }, (_, i) => summary(`lst_${i}`));
    fetch.mockImplementation(url =>
      Promise.resolve(
        url.includes('cursor=c2')
          ? reply(200, { data: [summary('lst_99')], next_cursor: null })
          : reply(200, { data: page1, next_cursor: 'c2' }),
      ),
    );
    const root = await render(<Home navigation={{ navigate: jest.fn(), setParams: jest.fn() }} />);
    await flush();

    const list = root.findAll(n => n.props.onEndReached && n.props.numColumns)[0];
    expect(list.props.data).toHaveLength(24);

    await act(async () => list.props.onEndReached());
    await flush();
    expect(calls('cursor=c2')).toHaveLength(1);
    expect(root.findAll(n => n.props.onEndReached && n.props.numColumns)[0].props.data).toHaveLength(25);

    // Last page: no more requests.
    await act(async () => root.findAll(n => n.props.onEndReached && n.props.numColumns)[0].props.onEndReached());
    await flush();
    expect(calls('cursor=')).toHaveLength(1);
  });

  test('an empty marketplace shows "No vehicles yet"', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValue(reply(200, { data: [], next_cursor: null }));
    const root = await render(<Home navigation={{ navigate: jest.fn(), setParams: jest.fn() }} />);
    await flush();
    // All tab: says what's there, even with the default Pune chip on.
    expect(root.findAll(n => n.props.title === 'No vehicles yet').length).toBeGreaterThan(0);
    expect(root.findAll(n => n.props.title === 'Clear filters')).toHaveLength(0);
  });
});

describe('vehicle page', () => {
  test('shows the fair price and inspection summary; a reserved vehicle cannot get offers', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValueOnce(reply(200, { listing: detail('lst_1', { status: 'RESERVED' }) }));
    const card = { id: 'lst_1', name: 'Hyundai Creta', year: 2022, fuel: 'Diesel', price: 1150000 };
    const root = await render(
      <VehicleListing navigation={{ navigate: jest.fn(), goBack: jest.fn() }} route={{ params: { vehicle: card } }} />,
    );
    await flush();

    const text = n => [].concat(n.props.children).join('');
    // Price & valuation: the asking price, and Turag's fair price range.
    expect(root.findAll(n => typeof n.type === 'string' && text(n) === 'Turag fair price').length).toBeGreaterThan(0);
    expect(root.findAll(n => typeof n.type === 'string' && text(n) === '₹11L to ₹12L').length).toBeGreaterThan(0);
    expect(root.findAll(n => n.props.label === 'Fairly priced').length).toBeGreaterThan(0);
    expect(root.findAll(n => n.props.label === 'Condition score' && n.props.value === '8.2/10').length).toBeGreaterThan(0);
    const offer = root.findAllByType(Button).find(b => b.props.title === 'Reserved');
    expect(offer.props.disabled).toBe(true);
  });

  test('a sold vehicle shows "No longer available"', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValueOnce(reply(404, { error: { code: 'NOT_FOUND' } }));
    const root = await render(
      <VehicleListing
        navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
        route={{ params: { vehicle: { id: 'gone', name: 'X' } } }}
      />,
    );
    await flush();
    expect(root.findAll(n => n.props.title === 'No longer available').length).toBeGreaterThan(0);
  });
});

describe('saved', () => {
  test('heart saves and un-saves with the listing id; a failed save is undone', async () => {
    await signIn();
    const vehicle = { id: 'lst_1', name: 'Hyundai Creta' };
    fetch.mockResolvedValueOnce(reply(201, { saved: {} }));
    await act(async () => toggleSaved(vehicle));
    expect(bodyOf(calls('/saved-listings')[0])).toEqual({ listing_id: 'lst_1' });
    expect(calls('/saved-listings')[0][1].headers.Authorization).toBe('Bearer access-1');
    expect(isSaved('lst_1')).toBe(true);

    fetch.mockResolvedValueOnce(reply(204));
    await act(async () => toggleSaved(vehicle));
    const del = calls('/saved-listings/lst_1')[0];
    expect(del[1].method).toBe('DELETE');
    expect(isSaved('lst_1')).toBe(false);

    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await act(async () => toggleSaved(vehicle));
    expect(isSaved('lst_1')).toBe(false);
  });
});

describe('make offer', () => {
  test('sends the amount in paise; a retry after an error reuses the same Idempotency-Key', async () => {
    jest.useFakeTimers();
    await signIn();
    fetch
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(
        reply(201, {
          offer: { offer_id: 'off_1', status: 'PENDING', amount: { amount_minor: 1100000_00 }, expires_at: null },
        }),
      );
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const root = await render(
      <MakeOffer navigation={navigation} route={{ params: { vehicle: { id: 'lst_1', name: 'Hyundai Creta' } } }} />,
    );
    const price = root.findAllByType(TextField).find(f => f.props.label === 'Price');
    await act(async () => price.props.onChangeText('1100000'));
    const submit = () => root.findAllByType(Button).find(b => b.props.title === 'Submit Offer');

    await act(async () => submit().props.onPress());
    expect(root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes('internet')).length).toBeGreaterThan(0);

    await act(async () => submit().props.onPress());
    const offers = calls('/marketplace/listings/lst_1/offers');
    expect(offers).toHaveLength(2);
    expect(bodyOf(offers[1])).toEqual({ amount: { amount_minor: 110000000, currency: 'INR' } });
    expect(offers[0][1].headers['Idempotency-Key']).toBeTruthy();
    expect(offers[1][1].headers['Idempotency-Key']).toBe(offers[0][1].headers['Idempotency-Key']);
  });
});
