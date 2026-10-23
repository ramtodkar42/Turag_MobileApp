/**
 * Pages opened from notifications: booking details, inspector chat, report,
 * My offers (buyer), My listing (seller) - mock backend - plus their real
 * services against a fake backend (fetch is mocked).
 */
/* eslint-env node */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { USE_REAL_API } from '../src/api/config';
import { ApiError } from '../src/api/client';
import { endSession, startSession } from '../src/api/session';
import { Badge, Button } from '../src/components';
import ConfirmDialog from '../src/components/feedback/ConfirmDialog';
import { ROUTES } from '../src/navigation/routes';
import notificationTarget from '../src/screens/notifications/notificationTarget';
import BookingDetails from '../src/screens/account/BookingDetails/BookingDetails';
import BookingChat from '../src/screens/account/BookingChat/BookingChat';
import InspectionReport from '../src/screens/account/InspectionReport/InspectionReport';
import MyOffers from '../src/screens/offers/MyOffers/MyOffers';
import MyListing from '../src/screens/selling/MyListing/MyListing';
import CounterSheet from '../src/screens/offers/components/CounterSheet';
import * as bookingApi from '../src/api/services/booking.api';
import * as reportApi from '../src/api/services/report.api';
import * as offerApi from '../src/api/services/offer.api';
import { getMyListing } from '../src/api/services/sellerListing.api';

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

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};
// Small steps, so mock delays that start one after another all finish.
const advance = async (ms = 1000) => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, ms - passed));
    });
  }
};
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn() });
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const buttons = (root, title) => root.findAllByType(Button).filter(b => b.props.title === title);
const badges = root => [...new Set(root.findAllByType(Badge).map(b => b.props.label))];
// Taps the confirm button of the open app dialog.
const confirmDialog = async root => {
  const dialog = root.findAllByType(ConfirmDialog).find(d => d.props.visible);
  await act(async () => {
    dialog.props.onConfirm();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  bookingApi.resetMockBookings();
  offerApi.resetMockOffers();
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('notification links', () => {
  test('booking, offers, listing and inspector-job links open their pages; others do not', () => {
    expect(notificationTarget('/account/bookings/bkg_1')).toEqual({
      route: ROUTES.BOOKING_DETAILS,
      params: { bookingId: 'bkg_1' },
    });
    expect(notificationTarget('/buy/offers')).toEqual({ route: ROUTES.MY_OFFERS, params: {} });
    expect(notificationTarget('/sell/lst_9')).toEqual({ route: ROUTES.MY_LISTING, params: { listingId: 'lst_9' } });
    expect(notificationTarget('https://turag.in/sell/lst_9?x=1')).toEqual({
      route: ROUTES.MY_LISTING,
      params: { listingId: 'lst_9' },
    });
    expect(notificationTarget('/ops/bookings/bkg_1')).toEqual({
      route: ROUTES.JOB_DETAILS,
      params: { bookingId: 'bkg_1' },
    });
    expect(notificationTarget('/ops/inspectors')).toBeNull();
    expect(notificationTarget('/sell/lst_9/preview')).toBeNull();
    expect(notificationTarget(null)).toBeNull();
  });
});

describe('My inspection (booking details)', () => {
  test('placeholders, then the banner, inspection details, progress and chat', async () => {
    const root = await render(<BookingDetails navigation={nav()} route={{ params: { bookingId: 'bkg_mock_1' } }} />);
    expect(hasText(root, 'Inspector assigned')).toBe(false);
    await advance(600);

    // Banner: kind, status and the Booking ID.
    expect(badges(root)).toContain('Inspector assigned');
    expect(hasText(root, 'Car Doorstep Inspection')).toBe(true);
    expect(hasText(root, 'Booking ID')).toBe(true);
    expect(hasText(root, 'bkg_mock_1')).toBe(true);
    // Inspection details: label -> value, one row each.
    const rows = root.findAll(n => n.type?.name === 'DetailRow').map(r => r.props.label);
    expect(rows).toEqual(['Date & time', 'Address', 'Inspection fee']);
    expect(hasText(root, '12, MG Road, Shivajinagar, Pune - 411005')).toBe(true);
    expect(hasText(root, '₹799')).toBe(true);
    expect(badges(root)).toContain('Payment pending');
    expect(button(root, 'View receipt')).toBeUndefined(); // not paid
    expect(button(root, 'Open chat').props.disabled).toBe(false);
    expect(button(root, 'View report')).toBeUndefined();
  });

  test('Cancel booking asks first, then shows Cancelled and closes the chat', async () => {
    const navigation = nav();
    const root = await render(<BookingDetails navigation={navigation} route={{ params: { bookingId: 'bkg_mock_1' } }} />);
    await advance(600);

    await act(async () => button(root, 'Cancel booking').props.onPress());
    await confirmDialog(root);
    await advance(700);

    expect(badges(root)).toContain('Cancelled');
    expect(hasText(root, 'This booking was cancelled.')).toBe(true);
    expect(button(root, 'Cancel booking')).toBeUndefined();
    expect(button(root, 'Open chat').props.disabled).toBe(true);
  });

  test('a completed booking opens its report', async () => {
    const navigation = nav();
    const root = await render(<BookingDetails navigation={navigation} route={{ params: { bookingId: 'bkg_mock_2' } }} />);
    await advance(600);

    expect(badges(root)).toContain('Completed');
    expect(badges(root)).toContain('Paid');
    expect(button(root, 'View receipt')).toBeDefined();
    await act(async () => button(root, 'View report').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.INSPECTION_REPORT, { inspectionId: 'insp_mock_r1' });
  });

  test('someone else’s / unknown booking: "Booking not found"', async () => {
    const root = await render(<BookingDetails navigation={nav()} route={{ params: { bookingId: 'bkg_nope' } }} />);
    await advance(600);
    expect(hasText(root, 'Booking not found')).toBe(true);
  });
});

describe('Inspector chat', () => {
  test('shows the conversation and sends a message at once', async () => {
    const root = await render(<BookingChat navigation={nav()} route={{ params: { bookingId: 'bkg_mock_1' } }} />);
    await advance(400);
    expect(hasText(root, 'I’ll reach your place at the booked time.')).toBe(true);

    const input = root.find(n => n.props.placeholder === 'Type a message' && n.props.onChangeText);
    await act(async () => input.props.onChangeText('Please call when you arrive'));
    await act(async () => root.find(n => n.props.accessibilityLabel === 'Send' && n.props.onPress).props.onPress());

    // Shown straight away as "Sending…", then saved.
    expect(hasText(root, 'Please call when you arrive')).toBe(true);
    expect(hasText(root, 'Sending…')).toBe(true);
    await advance(500);
    expect(hasText(root, 'Sending…')).toBe(false);
    expect(hasText(root, 'Please call when you arrive')).toBe(true);
  });
});

describe('Inspector chat - loading and connection', () => {
  const ChatSkeleton = require('../src/screens/account/BookingChat/components/ChatSkeleton').default;
  const ConnectionBanner = require('../src/screens/account/BookingChat/components/ConnectionBanner').default;
  const offlineError = () => new ApiError({ code: 'NETWORK_ERROR', message: 'Can’t reach Turag.' });
  const sendButton = root => root.find(n => n.props.accessibilityLabel === 'Send' && n.props.onPress);

  test('placeholder bubbles while it first loads', async () => {
    const root = await render(<BookingChat navigation={nav()} route={{ params: { bookingId: 'bkg_mock_1' } }} />);
    expect(root.findAllByType(ChatSkeleton)).toHaveLength(1);
    await advance(400);
    expect(root.findAllByType(ChatSkeleton)).toHaveLength(0);
  });

  test('can’t load: a message with Try again, sending waits; Try again brings the chat', async () => {
    const get = jest
      .spyOn(bookingApi, 'getBookingMessages')
      .mockRejectedValueOnce(offlineError())
      .mockRejectedValueOnce(offlineError());
    const root = await render(<BookingChat navigation={nav()} route={{ params: { bookingId: 'bkg_mock_1' } }} />);
    await advance(100);

    expect(hasText(root, 'Couldn’t load the chat')).toBe(true);
    expect(hasText(root, 'We’ll keep trying in the background.')).toBe(true);
    const input = root.find(n => n.props.placeholder === 'Waiting for connection…' && n.props.onChangeText);
    await act(async () => input.props.onChangeText('Hello'));
    expect(sendButton(root).props.disabled).toBe(true);

    // Still down: the button shows it's trying, the message stays.
    await act(async () => {
      button(root, 'Try again').props.onPress();
    });
    await advance(100);
    expect(hasText(root, 'Couldn’t load the chat')).toBe(true);

    // Back up.
    get.mockRestore();
    await act(async () => {
      button(root, 'Try again').props.onPress();
    });
    await advance(400);
    expect(hasText(root, 'I’ll reach your place at the booked time.')).toBe(true);
    expect(sendButton(root).props.disabled).toBe(false);
  });

  test('connection lost after loading: a banner, the conversation stays; it clears when back', async () => {
    const root = await render(<BookingChat navigation={nav()} route={{ params: { bookingId: 'bkg_mock_1' } }} />);
    await advance(400);
    expect(root.findAllByType(ConnectionBanner)).toHaveLength(0);

    const get = jest.spyOn(bookingApi, 'getBookingMessages').mockRejectedValue(offlineError());
    await advance(4100); // the next check fails
    expect(root.findAllByType(ConnectionBanner)).toHaveLength(1);
    expect(hasText(root, 'I’ll reach your place at the booked time.')).toBe(true);

    get.mockRestore();
    await act(async () => {
      root.findByType(ConnectionBanner).props.onRetry();
    });
    await advance(400);
    expect(root.findAllByType(ConnectionBanner)).toHaveLength(0);
  });
});

describe('Inspection report', () => {
  test('grade, score, value, findings (worst first) and documents', async () => {
    const root = await render(<InspectionReport navigation={nav()} route={{ params: { inspectionId: 'insp_mock_r1' } }} />);
    await advance(800);

    expect(hasText(root, 'KIA Seltos 2023')).toBe(true);
    expect(badges(root)).toEqual(expect.arrayContaining(['Turag Verified', 'Moderate', 'Minor', 'OK', 'Expired', 'Present']));
    expect(hasText(root, '84/100')).toBe(true);
    expect(hasText(root, 'Est. repair ₹9,000')).toBe(true);
    expect(hasText(root, 'Registration Certificate')).toBe(true);
    // Worst first: Moderate (tyres) before Minor (bumper).
    const labels = badges(root);
    expect(labels.indexOf('Moderate')).toBeLessThan(labels.indexOf('Minor'));
  });

  test('not verified yet: "Report not ready yet"', async () => {
    jest
      .spyOn(reportApi, 'getInspectionReport')
      .mockRejectedValue(new ApiError({ status: 409, code: 'REPORT_NOT_READY', message: 'x' }));
    const root = await render(<InspectionReport navigation={nav()} route={{ params: { inspectionId: 'insp_1' } }} />);
    await advance(100);
    expect(hasText(root, 'Report not ready yet')).toBe(true);
  });
});

describe('My offers (buyer)', () => {
  const card = (root, name) =>
    root.findAll(n => n.props.offer && n.props.onAccept).find(n => n.props.offer.vehicle?.model === name);

  test('lists the offers with the seller’s counter, time left and the accepted order', async () => {
    const root = await render(<MyOffers navigation={nav()} />);
    await advance(800);

    expect(badges(root)).toEqual(expect.arrayContaining(['Countered', 'Accepted', 'Declined']));
    expect(hasText(root, 'Seller’s counter')).toBe(true);
    expect(hasText(root, '₹2,35,000')).toBe(true);
    expect(hasText(root, 'Expires in 30 hr')).toBe(true);
    expect(hasText(root, 'Pay the token amount')).toBe(true);
    // Paying the token (and cancelling the order) happen on the offer's page, as the web.
    expect(button(root, 'Pay the token')).toBeDefined();
  });

  test('accepting the counter creates the order', async () => {
    const root = await render(<MyOffers navigation={nav()} />);
    await advance(800);

    await act(async () => card(root, 'Baleno').props.onAccept());
    await confirmDialog(root);
    await advance(1500);

    expect(card(root, 'Baleno').props.offer.status).toBe('ACCEPTED');
    expect(card(root, 'Baleno').props.offer.order).toEqual(expect.objectContaining({ status: 'CREATED', agreedPrice: 235000 }));
  });

  test('countering back sends the amount and waits for the seller again', async () => {
    const root = await render(<MyOffers navigation={nav()} />);
    await advance(800);

    await act(async () => card(root, 'Baleno').props.onCounter());
    const sheet = () => root.findByType(CounterSheet);
    expect(sheet().props.visible).toBe(true);
    const field = root.find(n => n.props.label === 'Your counter' && n.props.onChangeText);
    await act(async () => field.props.onChangeText('228000'));
    await act(async () => {
      buttons(root, 'Send counter').at(-1).props.onPress();
    });
    await advance(1500);

    expect(sheet().props.visible).toBe(false);
    const offer = card(root, 'Baleno').props.offer;
    expect(offer).toEqual(expect.objectContaining({ status: 'PENDING', amount: 228000, amountBy: 'BUYER' }));
  });

  test('cancelling an offer withdraws it', async () => {
    const root = await render(<MyOffers navigation={nav()} />);
    await advance(800);
    await act(async () => card(root, 'Baleno').props.onWithdraw());
    await confirmDialog(root);
    await advance(1500);
    expect(card(root, 'Baleno').props.offer.status).toBe('WITHDRAWN');
  });
});

describe('My listing (seller)', () => {
  const row = (root, id) => root.findAll(n => n.props.offer?.id === id && n.props.onDecline)[0];

  test('shows the listing and its offers with buyer and price-band details', async () => {
    const root = await render(<MyListing navigation={nav()} route={{ params: { listingId: 'lst_mock_1' } }} />);
    await advance(800);

    expect(hasText(root, 'KIA Seltos 2023')).toBe(true);
    expect(badges(root)).toEqual(expect.arrayContaining(['Live', 'Awaiting buyer']));
    expect(hasText(root, '₹8,95,000')).toBe(true);
    expect(hasText(root, 'Phone-verified buyer')).toBe(true);
    expect(hasText(root, 'In the trade-in range')).toBe(true);
    expect(button(root, 'Accept')).toBeDefined();
  });

  test('accepting an offer reserves the vehicle, declines the rest and starts the order', async () => {
    const root = await render(<MyListing navigation={nav()} route={{ params: { listingId: 'lst_mock_1' } }} />);
    await advance(800);

    await act(async () => row(root, 'off_mock_s1').props.onAccept());
    await confirmDialog(root);
    await advance(1500);

    expect(badges(root)).toEqual(expect.arrayContaining(['Reserved', 'Awaiting token payment', 'Declined']));
    expect(hasText(root, 'Order and handover')).toBe(true);
    expect(hasText(root, 'Waiting for the buyer to pay the token into escrow.')).toBe(true);
  });

  test('declining asks first', async () => {
    const root = await render(<MyListing navigation={nav()} route={{ params: { listingId: 'lst_mock_1' } }} />);
    await advance(800);
    await act(async () => row(root, 'off_mock_s1').props.onDecline());
    await confirmDialog(root);
    await advance(1500);
    expect(row(root, 'off_mock_s1').props.offer.status).toBe('DECLINED');
  });

  test('someone else’s listing: "Listing not found"', async () => {
    const root = await render(<MyListing navigation={nav()} route={{ params: { listingId: 'lst_other' } }} />);
    await advance(800);
    expect(hasText(root, 'Listing not found')).toBe(true);
  });
});

describe('real backend', () => {
  const reply = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  });
  const money = rupees => ({ amount_minor: rupees * 100, currency: 'INR' });
  const bodyOf = call => JSON.parse(call[1].body);

  beforeAll(() => {
    USE_REAL_API.bookings = true;
    USE_REAL_API.offers = true;
    USE_REAL_API.listings = true;
  });
  afterAll(() => {
    USE_REAL_API.bookings = false;
    USE_REAL_API.offers = false;
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

  const booking = (id, extra = {}) => ({
    booking_id: id,
    mode: 'DOORSTEP',
    category: 'PASSENGER',
    status: 'REQUESTED',
    address_line: '1 Road',
    pincode: '411001',
    city: 'PUNE',
    slot_at: '2026-10-06T04:30:00Z',
    price: money(799),
    inspector_assigned: false,
    valuation_id: null,
    inspection_id: null,
    fee_paid: false,
    created_at: '2026-10-05T04:30:00Z',
    ...extra,
  });

  test('one booking comes from the list (no single-booking endpoint); missing = BOOKING_NOT_FOUND', async () => {
    fetch.mockResolvedValue(reply(200, { bookings: [booking('bkg_1'), booking('bkg_2', { status: 'ASSIGNED', inspector_assigned: true })] }));
    const found = await bookingApi.getMyBooking('bkg_2');
    expect(fetch.mock.calls[0][0]).toMatch(/\/inspection-bookings$/);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer access-1');
    expect(found).toEqual(
      expect.objectContaining({ id: 'bkg_2', status: 'ASSIGNED', price: 799, city: 'Pune', canCancel: true, chatOpen: true }),
    );
    await expect(bookingApi.getMyBooking('bkg_x')).rejects.toMatchObject({ code: 'BOOKING_NOT_FOUND' });
  });

  test('cancel and chat calls', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { booking: booking('bkg_1', { status: 'CANCELLED' }) }))
      .mockResolvedValueOnce(reply(201, { message: { message_id: 'm1', body: 'Hi', sender_is_me: true, created_at: '2026-10-05T05:00:00Z' } }));

    const cancelled = await bookingApi.cancelMyBooking('bkg_1');
    expect(fetch.mock.calls[0][0]).toMatch(/\/inspection-bookings\/bkg_1\/cancel$/);
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(cancelled).toEqual(expect.objectContaining({ status: 'CANCELLED', canCancel: false, chatOpen: false }));

    const sent = await bookingApi.sendBookingMessage('bkg_1', '  Hi  ');
    expect(fetch.mock.calls[1][0]).toMatch(/\/inspection-bookings\/bkg_1\/messages$/);
    expect(bodyOf(fetch.mock.calls[1])).toEqual({ body: 'Hi' });
    expect(sent).toEqual(expect.objectContaining({ id: 'm1', text: 'Hi', mine: true }));
  });

  test('report: 409 keeps its code for the "not ready" screen', async () => {
    fetch.mockResolvedValueOnce(reply(409, { error: { code: 'REPORT_NOT_READY', message: 'not yet' } }));
    await expect(reportApi.getInspectionReport('insp_1')).rejects.toMatchObject({ status: 409, code: 'REPORT_NOT_READY' });
    expect(fetch.mock.calls[0][0]).toMatch(/\/reports\/insp_1$/);
  });

  const offer = (id, extra = {}) => ({
    offer_id: id,
    listing_id: 'lst_1',
    amount: money(500000),
    status: 'PENDING',
    expires_at: '2099-01-01T00:00:00Z',
    counter_history: [],
    decline_reason: null,
    order_id: null,
    vehicle: { make: 'Honda', model: 'City', mfg_year: 2020 },
    created_at: '2026-10-01T00:00:00Z',
    ...extra,
  });

  test('my offers load their orders; actions send the right bodies', async () => {
    fetch
      .mockResolvedValueOnce(
        reply(200, {
          offers: [
            offer('o1', { status: 'COUNTERED', amount: money(520000), counter_history: [{ by: 'SELLER', amount: money(520000), at: '2026-10-02T00:00:00Z' }] }),
            offer('o2', { status: 'ACCEPTED', order_id: 'ord_1', updated_at: '2026-10-03T00:00:00Z' }),
          ],
        }),
      )
      .mockResolvedValueOnce(
        reply(200, { order: { order_id: 'ord_1', listing_id: 'lst_1', offer_id: 'o2', agreed_price: money(500000), status: 'TOKEN_PAID', vehicle: null, created_at: 'x' } }),
      );

    const offers = await offerApi.getMyOffers();
    expect(fetch.mock.calls[0][0]).toMatch(/\/offers$/);
    expect(fetch.mock.calls[1][0]).toMatch(/\/orders\/ord_1$/);
    expect(offers.map(o => o.id)).toEqual(['o2', 'o1']); // newest first
    expect(offers[0].order).toEqual(expect.objectContaining({ status: 'TOKEN_PAID', agreedPrice: 500000 }));
    expect(offers[1]).toEqual(expect.objectContaining({ amount: 520000, amountBy: 'SELLER', open: true }));

    fetch.mockResolvedValueOnce(reply(200, { offer: offer('o1', { amount: money(510000) }) }));
    await offerApi.counterOffer('o1', 510000);
    expect(fetch.mock.calls[2][0]).toMatch(/\/offers\/o1\/counter$/);
    expect(bodyOf(fetch.mock.calls[2])).toEqual({ amount: { amount_minor: 51000000, currency: 'INR' } });

    fetch.mockResolvedValueOnce(reply(200, { offer: offer('o1', { status: 'DECLINED' }) }));
    await offerApi.declineOffer('o1');
    expect(fetch.mock.calls[3][0]).toMatch(/\/offers\/o1\/decline$/);
    expect(bodyOf(fetch.mock.calls[3])).toEqual({ reason: null });

    fetch.mockResolvedValueOnce(reply(200, { order: { order_id: 'ord_1', status: 'CANCELLED', agreed_price: money(500000) } }));
    await offerApi.cancelOrder('ord_1');
    expect(fetch.mock.calls[4][0]).toMatch(/\/orders\/ord_1\/cancel$/);
    expect(bodyOf(fetch.mock.calls[4])).toEqual({ reason: null });
  });

  test('my listing: offers are only loaded while live / reserved', async () => {
    const listing = status => ({
      listing_id: 'lst_1',
      status,
      vehicle: { make: 'Honda', model: 'City', mfg_year: 2020 },
      ask_price: money(600000),
      version: 1,
    });
    fetch.mockResolvedValueOnce(reply(200, { listing: listing('PENDING_REVIEW') }));
    const review = await getMyListing('lst_1');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(review).toEqual({ listing: expect.objectContaining({ status: 'PENDING_REVIEW', takesOffers: false }), offers: [] });

    fetch
      .mockResolvedValueOnce(reply(200, { listing: listing('LIVE') }))
      .mockResolvedValueOnce(reply(200, { offers: [offer('o9', { buyer_verification: { phone_verified: true }, band_position: 'RETAIL' })] }));
    const live = await getMyListing('lst_1');
    expect(fetch.mock.calls[1][0]).toMatch(/\/listings\/lst_1$/);
    expect(fetch.mock.calls[2][0]).toMatch(/\/listings\/lst_1\/offers$/);
    expect(live.listing.askPrice).toBe(600000);
    expect(live.offers[0]).toEqual(expect.objectContaining({ id: 'o9', phoneVerified: true, bandPosition: 'RETAIL', order: null }));
  });
});
