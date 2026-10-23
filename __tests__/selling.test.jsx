/**
 * Selling (as the web's /sell pages): list a valued Garage vehicle, submit it
 * for review, change the price, withdraw, My listings - mock backend - plus
 * the real listing calls against a fake backend (fetch is mocked).
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Badge, Button, CheckRow, TextField } from '../src/components';
import ConfirmDialog from '../src/components/feedback/ConfirmDialog';
import CreateListing from '../src/screens/listing/CreateListing/CreateListing';
import MyListing from '../src/screens/selling/MyListing/MyListing';
import MyListings from '../src/screens/selling/MyListings/MyListings';
import CounterSheet from '../src/screens/offers/components/CounterSheet';
import * as listingApi from '../src/api/services/sellerListing.api';
import { resetMockOffers } from '../src/api/services/offer.api';
import { USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import { ROUTES } from '../src/navigation/routes';

// Pages reload when they come back into view; here, once after mounting.
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

const garageVehicle = {
  id: 'g-1',
  vehicleId: 'veh_9',
  valuationId: 'val_9',
  inspectionId: null,
  make: 'Hyundai',
  model: 'Creta',
  year: 2022,
  estimatedValue: 1150000,
  inspectionEligible: true, // valued and inspected: listable (ADR-0038)
};

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};
const advance = async (ms = 1000) => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, ms - passed));
    });
  }
};
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() });
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const field = (root, label) => root.findAllByType(TextField).find(f => f.props.label === label);
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const badges = root => [...new Set(root.findAllByType(Badge).map(b => b.props.label))];
const confirmDialog = async root => {
  const dialog = root.findAllByType(ConfirmDialog).find(d => d.props.visible);
  await act(async () => {
    dialog.props.onConfirm();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  listingApi.resetMockListings();
  resetMockOffers();
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('List this vehicle', () => {
  test('price starts at the estimate; ownership must be confirmed; creates a draft and opens it', async () => {
    const create = jest.spyOn(listingApi, 'createListing');
    const navigation = nav();
    const root = await render(<CreateListing navigation={navigation} route={{ params: { vehicle: garageVehicle } }} />);

    expect(field(root, 'Asking price').props.value).toBe('11,50,000');
    expect(hasText(root, 'Your estimated value is ₹11,50,000. This is guidance, not a limit.')).toBe(true);
    expect(button(root, 'Create listing').props.disabled).toBe(true); // not attested yet

    await act(async () => field(root, 'Asking price').props.onChangeText('11,90,000'));
    await act(async () => field(root, 'Note to buyers').props.onChangeText('  Single owner, full service history.  '));
    await act(async () => root.findByType(CheckRow).props.onToggle());
    expect(button(root, 'Create listing').props.disabled).toBe(false);

    // Where the vehicle is: city + state are required (as the web) - says so, creates nothing.
    await act(async () => {
      button(root, 'Create listing').props.onPress();
    });
    expect(hasText(root, 'Set your city and state using the map.')).toBe(true);
    expect(create).not.toHaveBeenCalled();
    await act(async () => field(root, 'City').props.onChangeText('Pune'));
    await act(async () => field(root, 'State').props.onChangeText('Maharashtra'));
    await act(async () => field(root, 'Pincode').props.onChangeText('411045'));
    expect(hasText(root, 'Set your city and state using the map.')).toBe(false);

    await act(async () => {
      button(root, 'Create listing').props.onPress();
    });
    await advance(900);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleId: 'veh_9',
        valuationId: 'val_9',
        inspectionId: null,
        askPrice: 1190000,
        sellerNote: '  Single owner, full service history.  ',
        location: {
          city: 'Pune',
          state: 'Maharashtra',
          locality: null,
          pincode: '411045',
          address_line: null,
          building: null,
          landmark: null,
          geo_lat: null,
          geo_lng: null,
        },
        idempotencyKey: expect.any(String),
      }),
    );
    expect(navigation.replace).toHaveBeenCalledWith(ROUTES.MY_LISTING, { listingId: expect.stringMatching(/^lst_mock_/) });
  });

  test('clearing the price says "Enter an asking price."', async () => {
    const root = await render(<CreateListing navigation={nav()} route={{ params: { vehicle: garageVehicle } }} />);
    expect(field(root, 'Asking price').props.error).toBe('');
    await act(async () => field(root, 'Asking price').props.onChangeText(''));
    expect(field(root, 'Asking price').props.error).toBe('Enter an asking price.');
    expect(button(root, 'Create listing').props.disabled).toBe(true);
  });
});

describe('My listing (manage)', () => {
  const createDraft = async () => {
    const draft = listingApi.createListing({
      vehicleId: 'veh_9',
      valuationId: 'val_9',
      askPrice: 1150000,
      vehicle: garageVehicle,
    });
    await advance(900);
    return draft;
  };

  test('a draft can be submitted for review; then it is "In review" with the moderation note', async () => {
    const listing = await createDraft();
    const root = await render(<MyListing navigation={nav()} route={{ params: { listingId: listing.id } }} />);
    await advance(600);

    expect(badges(root)).toContain('Draft');
    expect(hasText(root, 'This listing is a draft. Submit it for review to go live.')).toBe(true);
    await act(async () => {
      button(root, 'Submit for review').props.onPress();
    });
    await advance(700);

    expect(badges(root)).toContain('In review');
    expect(hasText(root, 'Your listing is in the moderation queue.')).toBe(true);
    expect(button(root, 'Submit for review')).toBeUndefined();
    expect(button(root, 'Change')).toBeUndefined(); // price is locked during review
    expect(button(root, 'Withdraw')).toBeDefined();
  });

  test('changing the asking price on a draft', async () => {
    const listing = await createDraft();
    const root = await render(<MyListing navigation={nav()} route={{ params: { listingId: listing.id } }} />);
    await advance(600);

    await act(async () => button(root, 'Change').props.onPress());
    const sheet = root.findAllByType(CounterSheet).find(s => s.props.visible);
    expect(sheet.props.title).toBe('Change asking price');
    await act(async () => field(root, 'New asking price').props.onChangeText('1120000'));
    await act(async () => {
      root.findAllByType(Button).filter(b => b.props.title === 'Update').at(-1).props.onPress();
    });
    await advance(600);
    expect(hasText(root, '₹11,20,000')).toBe(true);
  });

  test('withdrawing asks first, then it is final', async () => {
    const listing = await createDraft();
    const root = await render(<MyListing navigation={nav()} route={{ params: { listingId: listing.id } }} />);
    await advance(600);

    await act(async () => button(root, 'Withdraw').props.onPress());
    await confirmDialog(root);
    await advance(600);
    expect(badges(root)).toContain('Withdrawn');
    expect(hasText(root, 'You withdrew this listing. Create a new listing to sell again.')).toBe(true);
    expect(button(root, 'Withdraw')).toBeUndefined();
  });
});

describe('My listings', () => {
  test('rows show status, verification and price; tapping opens the listing', async () => {
    const created = listingApi.createListing({ vehicleId: 'veh_9', valuationId: 'val_9', askPrice: 1150000, vehicle: garageVehicle });
    await advance(900);
    await created;
    const navigation = nav();
    const root = await render(<MyListings navigation={navigation} />);
    await advance(600);

    const rows = root.findAll(n => n.props.listing && n.props.onPress);
    expect(rows.map(r => r.props.listing.status)).toEqual(expect.arrayContaining(['DRAFT', 'LIVE']));
    expect(badges(root)).toEqual(expect.arrayContaining(['Draft', 'Live']));
    expect(hasText(root, 'Turag Verified')).toBe(true);
    expect(hasText(root, '₹8,95,000')).toBe(true);

    await act(async () => rows[0].props.onPress(rows[0].props.listing));
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MY_LISTING, { listingId: rows[0].props.listing.id });
    await act(async () => button(root, 'List a vehicle').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MAIN_TABS, { screen: ROUTES.GARAGE });
  });
});

describe('real backend', () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  const money = rupees => ({ amount_minor: rupees * 100, currency: 'INR' });
  const listingView = (extra = {}) => ({
    listing_id: 'lst_1',
    status: 'DRAFT',
    vehicle: { make: 'Hyundai', model: 'Creta', variant: null, mfg_year: 2022 },
    ask_price: money(1150000),
    seller_note: null,
    verification: { verification_label: 'NOT_VERIFIED', turag_verified: false },
    version: 1,
    created_at: '2026-10-05T10:00:00Z',
    ...extra,
  });
  const call = i => ({ url: fetch.mock.calls[i][0], init: fetch.mock.calls[i][1] });

  beforeAll(() => {
    USE_REAL_API.listings = true;
  });
  afterAll(() => {
    USE_REAL_API.listings = false;
  });
  beforeEach(async () => {
    jest.useRealTimers();
    global.fetch = jest.fn();
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    await endSession();
  });

  test('create sends the web’s body with the idempotency key', async () => {
    fetch.mockResolvedValueOnce(reply(201, { listing: listingView() }));
    const listing = await listingApi.createListing({
      vehicleId: 'veh_9',
      valuationId: 'val_9',
      inspectionId: 'insp_1',
      askPrice: 1150000,
      sellerNote: '  Well kept  ',
      idempotencyKey: 'key-1',
    });
    const { url, init } = call(0);
    expect(url).toMatch(/\/listings$/);
    expect(init.method).toBe('POST');
    expect(init.headers['Idempotency-Key']).toBe('key-1');
    expect(JSON.parse(init.body)).toEqual({
      vehicle_id: 'veh_9',
      valuation_id: 'val_9',
      inspection_id: 'insp_1',
      ask_price: { amount_minor: 115000000, currency: 'INR' },
      seller_note: 'Well kept',
      ownership_attested: true,
    });
    expect(listing).toEqual(
      expect.objectContaining({ id: 'lst_1', status: 'DRAFT', canSubmit: true, canEditPrice: true, canWithdraw: true }),
    );
  });

  test('a known error keeps its message (e.g. already listed)', async () => {
    fetch.mockResolvedValueOnce(
      reply(409, { error: { code: 'LISTING_ALREADY_ACTIVE', message: 'This vehicle already has an active listing.' } }),
    );
    await expect(
      listingApi.createListing({ vehicleId: 'veh_9', valuationId: 'val_9', askPrice: 1, idempotencyKey: 'k' }),
    ).rejects.toMatchObject({ status: 409, code: 'LISTING_ALREADY_ACTIVE', message: 'This vehicle already has an active listing.' });
  });

  test('submit, price and withdraw (with the version)', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { listing: listingView({ status: 'PENDING_REVIEW', version: 2 }) }))
      .mockResolvedValueOnce(reply(200, { listing: listingView({ status: 'LIVE', version: 4, ask_price: money(1100000) }) }))
      .mockResolvedValueOnce(reply(200, { listing: listingView({ status: 'WITHDRAWN', version: 5 }) }));

    expect((await listingApi.submitListing('lst_1')).status).toBe('PENDING_REVIEW');
    expect(call(0).url).toMatch(/\/listings\/lst_1\/submit$/);
    expect(call(0).init.method).toBe('POST');

    const priced = await listingApi.updateListingPrice('lst_1', 1100000, 3);
    expect(call(1).url).toMatch(/\/listings\/lst_1$/);
    expect(call(1).init.method).toBe('PATCH');
    expect(JSON.parse(call(1).init.body)).toEqual({ ask_price: { amount_minor: 110000000, currency: 'INR' }, version: 3 });
    expect(priced).toEqual(expect.objectContaining({ askPrice: 1100000, version: 4 }));

    const withdrawn = await listingApi.withdrawListing('lst_1', 4);
    expect(JSON.parse(call(2).init.body)).toEqual({ status: 'WITHDRAWN', version: 4 });
    expect(withdrawn).toEqual(expect.objectContaining({ status: 'WITHDRAWN', canWithdraw: false }));
  });

  test('My listings maps the summaries', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, {
        listings: [
          {
            listing_id: 'lst_1',
            status: 'LIVE',
            vehicle: { make: 'Hyundai', model: 'Creta', mfg_year: 2022 },
            ask_price: money(1150000),
            verification_label: 'TURAG_VERIFIED',
            created_at: '2026-10-01T10:00:00Z',
            published_at: '2026-10-02T10:00:00Z',
            expires_at: '2026-11-01T10:00:00Z',
          },
        ],
      }),
    );
    const listings = await listingApi.getMyListings();
    expect(call(0).url).toMatch(/\/listings$/);
    expect(listings).toEqual([
      expect.objectContaining({
        id: 'lst_1',
        status: 'LIVE',
        askPrice: 1150000,
        verificationLabel: 'TURAG_VERIFIED',
        vehicle: { make: 'Hyundai', model: 'Creta', year: 2022 },
      }),
    ]);
  });
});
