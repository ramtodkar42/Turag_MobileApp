/**
 * @format
 */

// Offer negotiation limits (ADR-0108): the server says the lowest offer / counter
// allowed on a listing; the app shows it on the offer form and the counter sheets,
// and turns the server's refusal into plain words with that amount.
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppText } from '../src/components';
import MakeOffer from '../src/screens/marketplace/MakeOffer/MakeOffer';
import CounterSheet from '../src/screens/offers/components/CounterSheet';
import * as offerApi from '../src/api/services/offer.api';
import { ApiError } from '../src/api/client';
import { USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import { clearUser, setUser } from '../src/store/userStore';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const vehicle = { id: 'lst_1', name: 'KIA Seltos', year: 2023, fuel: 'Petrol', price: 880000 };
const limits = { askPrice: 880000, buyerMin: 792000, sellerMin: 704000 };

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  return tree.root;
};
const texts = root => root.findAllByType(AppText).map(n => [].concat(n.props.children).join(''));

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  act(() => clearUser());
  jest.restoreAllMocks();
});

describe('on screen', () => {
  test('Make an offer shows the asking price and the lowest offer allowed', async () => {
    act(() => setUser({ fullName: 'Test User', role: 'individual' }));
    const get = jest.spyOn(offerApi, 'getOfferLimits').mockResolvedValue(limits);
    const root = await render(<MakeOffer navigation={{ navigate: jest.fn(), goBack: jest.fn() }} route={{ params: { vehicle } }} />);
    expect(get).toHaveBeenCalledWith('lst_1');
    expect(texts(root)).toContain(
      'Asking price is ₹8,80,000. You can offer from ₹7,92,000. No money moves now. The seller reviews your offer.',
    );
  });

  test('a guest is not asked for the limits (they need sign-in); no hint until they can be read', async () => {
    const get = jest.spyOn(offerApi, 'getOfferLimits').mockResolvedValue(limits);
    const root = await render(<MakeOffer navigation={{ navigate: jest.fn(), goBack: jest.fn() }} route={{ params: { vehicle } }} />);
    expect(get).not.toHaveBeenCalled();
    expect(texts(root).some(s => s.includes('You can offer from'))).toBe(false);
  });

  test('the counter sheet shows the lowest counter when it is known', async () => {
    let root = await render(<CounterSheet visible title="Counter" current={800000} minAmount={704000} onSubmit={jest.fn()} onClose={jest.fn()} />);
    expect(texts(root)).toContain('You can counter from ₹7,04,000.');
    act(() => tree.unmount());
    // The asking-price sheet (or limits not read yet): no line.
    root = await render(<CounterSheet visible title="Change asking price" current={800000} onSubmit={jest.fn()} onClose={jest.fn()} />);
    expect(texts(root).some(s => s.includes('You can counter from'))).toBe(false);
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
  const belowLimit = minRupees =>
    reply(422, {
      error: {
        code: 'OFFER_BELOW_NEGOTIATION_LIMIT',
        message: 'Offer is below the negotiation limit.',
        details: { min_amount_minor: minRupees * 100 },
      },
    });
  const before = { offers: USE_REAL_API.offers, marketplace: USE_REAL_API.marketplace };
  let originalFetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    USE_REAL_API.offers = true;
    USE_REAL_API.marketplace = true;
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
  });
  afterEach(async () => {
    global.fetch = originalFetch;
    USE_REAL_API.offers = before.offers;
    USE_REAL_API.marketplace = before.marketplace;
    await endSession();
  });

  test('reads the limits for a listing, in rupees', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, {
        ask_price: money(880000),
        buyer_min_amount: money(792000),
        seller_min_amount: money(704000),
        buyer_max_discount_bps: 1000,
        seller_max_discount_bps: 2000,
        request_id: 'r',
      }),
    );
    expect(await offerApi.getOfferLimits('lst_1')).toEqual(limits);
    expect(fetch.mock.calls[0][0]).toMatch(/\/marketplace\/listings\/lst_1\/offer-limits$/);
  });

  test('an offer below the limit says the lowest amount allowed', async () => {
    fetch.mockResolvedValueOnce(belowLimit(792000));
    await expect(offerApi.submitOffer({ vehicleId: 'lst_1', price: 500000, idempotencyKey: 'k1' })).rejects.toMatchObject({
      code: 'OFFER_BELOW_NEGOTIATION_LIMIT',
      message: 'The lowest offer you can make on this car is ₹7,92,000.',
    });
  });

  test('a counter below the limit, or on a listing no longer live, says so plainly', async () => {
    fetch
      .mockResolvedValueOnce(belowLimit(704000))
      .mockResolvedValueOnce(reply(409, { error: { code: 'LISTING_NOT_AVAILABLE', message: 'Listing not available' } }));
    await expect(offerApi.counterOffer('off_1', 600000)).rejects.toMatchObject({
      message: 'The lowest counter-offer you can send is ₹7,04,000.',
    });
    await expect(offerApi.counterOffer('off_1', 750000)).rejects.toMatchObject({
      code: 'LISTING_NOT_AVAILABLE',
      message: 'This vehicle is no longer available for offers.',
    });
  });

  test('other refusals are passed on as they are', async () => {
    fetch.mockResolvedValueOnce(reply(409, { error: { code: 'OFFER_ALREADY_ACTIVE', message: 'You already have an offer' } }));
    const error = await offerApi.submitOffer({ vehicleId: 'lst_1', price: 850000, idempotencyKey: 'k2' }).catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('OFFER_ALREADY_ACTIVE');
  });
});
