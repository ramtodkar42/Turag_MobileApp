/**
 * The AI Self Inspection fee in the Android app: Google Play Billing. Google's sheet
 * takes the money, the server checks the purchase with Google, and only then is the
 * purchase finished (consumed) - so nobody is charged twice and nothing is lost.
 */

import { NativeModules } from 'react-native';
import { payForSelfInspection, recoverPlayPurchases } from '../src/api/services/selfInspection.api';
import { PLAY_BILLING, USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});
const call = i => {
  const [url, init = {}] = global.fetch.mock.calls[i];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined };
};
const captured = { payment: { payment_id: 'pay_1', status: 'CAPTURED', amount: { amount_minor: 49900, currency: 'INR' } } };
const playError = code => Object.assign(new Error(code), { code });
const bought = (over = {}) => ({
  token: 'tok_1',
  orderId: 'GPA.1',
  state: 'purchased',
  products: ['self_inspection_fee'],
  accountId: 'usr_1',
  profileId: 'insp_1',
  acknowledged: false,
  ...over,
});

let originalFetch;
const before = { ...PLAY_BILLING, auth: USE_REAL_API.auth };
beforeEach(async () => {
  originalFetch = global.fetch;
  global.fetch = jest.fn();
  USE_REAL_API.auth = true;
  PLAY_BILLING.enabled = true;
  PLAY_BILLING.devStub = false;
  NativeModules.PlayBilling = {
    purchase: jest.fn().mockResolvedValue([bought()]),
    getPurchases: jest.fn().mockResolvedValue([]),
    consume: jest.fn().mockResolvedValue(true),
    getProduct: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
});
afterEach(async () => {
  global.fetch = originalFetch;
  USE_REAL_API.auth = before.auth;
  PLAY_BILLING.enabled = before.enabled;
  PLAY_BILLING.devStub = before.devStub;
  delete NativeModules.PlayBilling;
  await endSession();
});

test('Google sheet, then the server checks the purchase, then it is finished', async () => {
  global.fetch.mockResolvedValueOnce(reply(200, captured));
  const phases = [];
  const paid = await payForSelfInspection('insp_1', { accountId: 'usr_1', onPhase: p => phases.push(p) });

  expect(paid).toEqual({ result: 'paid', amountMinor: 49900 });
  expect(phases).toEqual(['starting', 'confirming']);
  // Bought for this user and this inspection, so the server can check whose fee it is.
  expect(NativeModules.PlayBilling.purchase).toHaveBeenCalledWith('self_inspection_fee', 'usr_1', 'insp_1');
  expect(call(0).url).toMatch(/\/inspections\/insp_1\/pay\/google-play$/);
  expect(call(0).method).toBe('POST');
  expect(call(0).body).toEqual({ product_id: 'self_inspection_fee', purchase_token: 'tok_1' });
  // Only one server call: never the old Razorpay POST /pay.
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(NativeModules.PlayBilling.consume).toHaveBeenCalledWith('tok_1');
});

test('already paid on this phone (the app closed before the server had it): sent again, no second charge', async () => {
  NativeModules.PlayBilling.getPurchases.mockResolvedValue([bought({ token: 'tok_old' })]);
  global.fetch.mockResolvedValueOnce(reply(200, captured));
  const paid = await payForSelfInspection('insp_1', { accountId: 'usr_1' });

  expect(paid.result).toBe('paid');
  expect(NativeModules.PlayBilling.purchase).not.toHaveBeenCalled();
  expect(call(0).body.purchase_token).toBe('tok_old');
  expect(NativeModules.PlayBilling.consume).toHaveBeenCalledWith('tok_old');
});

test('closed the sheet: cancelled, nothing sent', async () => {
  NativeModules.PlayBilling.purchase.mockRejectedValue(playError('cancelled'));
  const paid = await payForSelfInspection('insp_1');
  expect(paid).toMatchObject({ result: 'failed', kind: 'cancelled', messageKey: 'selfInspection.pay.cancelled' });
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a pending payment (e.g. cash at a shop): wait, nothing sent or finished', async () => {
  NativeModules.PlayBilling.purchase.mockResolvedValue([bought({ state: 'pending' })]);
  const paid = await payForSelfInspection('insp_1');
  expect(paid).toMatchObject({ result: 'pending', messageKey: 'selfInspection.pay.pending' });
  expect(global.fetch).not.toHaveBeenCalled();
  expect(NativeModules.PlayBilling.consume).not.toHaveBeenCalled();

  // Tapping Submit again while it is still pending doesn't open a second purchase.
  NativeModules.PlayBilling.getPurchases.mockResolvedValue([bought({ state: 'pending' })]);
  NativeModules.PlayBilling.purchase.mockClear();
  expect((await payForSelfInspection('insp_1')).result).toBe('pending');
  expect(NativeModules.PlayBilling.purchase).not.toHaveBeenCalled();
});

test('the server refuses the purchase: not finished, so Google refunds it', async () => {
  global.fetch.mockResolvedValueOnce(
    reply(422, { error: { code: 'STORE_PURCHASE_INVALID', message: 'this purchase is for a different inspection' } }),
  );
  const paid = await payForSelfInspection('insp_1');
  expect(paid).toMatchObject({ result: 'failed', messageKey: 'selfInspection.pay.playRefused' });
  expect(NativeModules.PlayBilling.consume).not.toHaveBeenCalled();
});

test("Google's check is down: still confirming, and the purchase is kept to send again", async () => {
  global.fetch.mockResolvedValueOnce(
    reply(503, { error: { code: 'PAYMENT_PROVIDER_UNAVAILABLE', message: 'could not verify' } }),
  );
  const paid = await payForSelfInspection('insp_1');
  expect(paid.result).toBe('awaiting');
  expect(NativeModules.PlayBilling.consume).not.toHaveBeenCalled();
});

test('fee already paid another way: counts as paid, the purchase is left for Google to refund', async () => {
  global.fetch.mockResolvedValueOnce(
    reply(409, { error: { code: 'FEE_ALREADY_PAID', message: 'This inspection is already paid.' } }),
  );
  const paid = await payForSelfInspection('insp_1');
  expect(paid).toMatchObject({ result: 'paid', alreadyPaid: true });
  // Not finished, so Google refunds it.
  expect(NativeModules.PlayBilling.consume).not.toHaveBeenCalled();

  // And it isn't sent again by the recovery on this app session.
  NativeModules.PlayBilling.getPurchases.mockResolvedValue([bought()]);
  global.fetch.mockClear();
  expect(await recoverPlayPurchases()).toBe(0);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('payments switched off on the server: unavailable', async () => {
  global.fetch.mockResolvedValueOnce(reply(503, { error: { code: 'PAYMENTS_UNAVAILABLE', message: 'off' } }));
  expect((await payForSelfInspection('insp_1')).result).toBe('unavailable');
});

test('no Google Play on the phone: a clear message; a debug build uses the test server stub', async () => {
  NativeModules.PlayBilling.purchase.mockRejectedValue(playError('unavailable'));
  const paid = await payForSelfInspection('insp_1');
  expect(paid).toMatchObject({ result: 'unavailable', messageKey: 'selfInspection.pay.playUnavailable' });
  expect(global.fetch).not.toHaveBeenCalled();

  PLAY_BILLING.devStub = true;
  global.fetch.mockResolvedValueOnce(reply(200, captured));
  expect((await payForSelfInspection('insp_1')).result).toBe('paid');
  expect(call(0).body.purchase_token).toMatch(/^gp_stub_insp_1_/);
  // A made-up purchase is never "finished" with Google.
  expect(NativeModules.PlayBilling.consume).not.toHaveBeenCalled();
});

test('an earlier purchase still open on this phone: it is recorded first, then try again', async () => {
  NativeModules.PlayBilling.purchase.mockRejectedValue(playError('already_owned'));
  // The open one is for another inspection: recorded there.
  NativeModules.PlayBilling.getPurchases
    .mockResolvedValueOnce([]) // nothing for insp_1
    .mockResolvedValueOnce([bought({ token: 'tok_other', profileId: 'insp_9' })]);
  global.fetch.mockResolvedValueOnce(reply(200, captured));
  const paid = await payForSelfInspection('insp_1');

  expect(paid).toMatchObject({ result: 'awaiting', messageKey: 'selfInspection.pay.playOwned' });
  expect(call(0).url).toMatch(/\/inspections\/insp_9\/pay\/google-play$/);
  expect(NativeModules.PlayBilling.consume).toHaveBeenCalledWith('tok_other');
});

test('recovery: each paid fee goes to its own inspection; pending and other products are left alone', async () => {
  NativeModules.PlayBilling.getPurchases.mockResolvedValue([
    bought({ token: 'tok_a', profileId: 'insp_a' }),
    bought({ token: 'tok_b', profileId: 'insp_b', state: 'pending' }),
    bought({ token: 'tok_c', profileId: 'insp_c', products: ['something_else'] }),
  ]);
  global.fetch.mockResolvedValueOnce(reply(200, captured));
  expect(await recoverPlayPurchases()).toBe(1);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(call(0).url).toMatch(/\/inspections\/insp_a\/pay\/google-play$/);
  expect(NativeModules.PlayBilling.consume).toHaveBeenCalledTimes(1);
  expect(NativeModules.PlayBilling.consume).toHaveBeenCalledWith('tok_a');
});

test('recovery on a phone without Google Play billing does nothing', async () => {
  NativeModules.PlayBilling.getPurchases.mockRejectedValue(playError('unavailable'));
  expect(await recoverPlayPurchases()).toBe(0);
  delete NativeModules.PlayBilling;
  expect(await recoverPlayPurchases()).toBe(0);
  expect(global.fetch).not.toHaveBeenCalled();
});
