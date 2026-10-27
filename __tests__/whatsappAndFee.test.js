/**
 * Backend drop (8), as the web: the login code on WhatsApp, the WhatsApp
 * updates consent, WhatsApp car alerts, and the self-inspection fee (submit is
 * refused until it's paid; the Garage shows "Payment pending").
 */
import { getOtpChannels, sendLoginOtp } from '../src/api/services/auth.api';
import { setOptionalConsent, acceptConsents } from '../src/api/services/profile.api';
import { createCarAlert, deleteCarAlert, listCarAlerts } from '../src/api/services/carAlerts.api';
import { payForSelfInspection } from '../src/api/services/selfInspection.api';
import { garagePhase } from '../src/api/mappers/valuation';
import { phaseAction, phaseBadge } from '../src/screens/garage/garagePhase';
import { endSession, startSession } from '../src/api/session';
import { USE_REAL_API } from '../src/api/config';

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});
const call = i => {
  const [url, init = {}] = global.fetch.mock.calls[i];
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers ?? {} };
};

let originalFetch;
const authBefore = USE_REAL_API.auth;
beforeEach(async () => {
  originalFetch = global.fetch;
  global.fetch = jest.fn();
  USE_REAL_API.auth = true;
  await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
});
afterEach(async () => {
  global.fetch = originalFetch;
  USE_REAL_API.auth = authBefore;
  await endSession();
});

describe('login code on WhatsApp or SMS', () => {
  test('the channels the server offers, in its order; nothing known when it fails', async () => {
    global.fetch.mockResolvedValueOnce(reply(200, { channels: ['whatsapp', 'sms'] }));
    expect(await getOtpChannels()).toEqual(['whatsapp', 'sms']);
    expect(call(0).url).toMatch(/\/auth\/otp\/channels$/);

    global.fetch.mockResolvedValueOnce(reply(500, { error: { code: 'INTERNAL', message: 'down' } }));
    expect(await getOtpChannels()).toEqual([]);
  });

  test('the chosen channel is sent with the number; none chosen leaves it to the server', async () => {
    global.fetch.mockResolvedValue(reply(200, { otp_token: 't1', expires_in: 300, resend_after: 30 }));
    await sendLoginOtp({ phone: '9876543210', channel: 'whatsapp' });
    expect(call(0).body).toEqual({ phone: '+919876543210', channel: 'whatsapp' });
    await sendLoginOtp({ phone: '9876543210' });
    expect(call(1).body).toEqual({ phone: '+919876543210' });
  });
});

describe('WhatsApp updates consent', () => {
  test('the switch records just that choice; both optional ones always show', async () => {
    global.fetch.mockResolvedValueOnce(
      reply(200, { consents_summary: [{ purpose: 'ACCOUNT_TERMS', granted: true }, { purpose: 'WHATSAPP', granted: true }] }),
    );
    const consents = await setOptionalConsent('WHATSAPP', true);
    expect(call(0).body).toEqual({ whatsapp: true });
    expect(consents.map(c => [c.key, c.verified])).toEqual([
      ['ACCOUNT_TERMS', true],
      ['WHATSAPP', true],
      ['MARKETING', false],
    ]);
  });

  test('sign-up sends WhatsApp only when ticked', async () => {
    global.fetch.mockResolvedValue(reply(200, { consents_summary: [] }));
    await acceptConsents({ terms: true, privacy: true, marketing: false, whatsapp: true });
    expect(call(0).body).toEqual({ accept_terms: true, accept_privacy: true, marketing: false, whatsapp: true });
    await acceptConsents({ terms: true, privacy: true, marketing: false, whatsapp: false });
    expect(call(1).body).toEqual({ accept_terms: true, accept_privacy: true, marketing: false });
  });
});

describe('WhatsApp car alerts', () => {
  test('list, add a matching alert (only what was picked, budget in paise), remove', async () => {
    global.fetch
      .mockResolvedValueOnce(reply(200, { alerts: [{ id: 'a1', scope: 'ALL', created_at: 'x' }] }))
      .mockResolvedValueOnce(
        reply(201, { alert: { id: 'a2', scope: 'MATCH', make: 'Hyundai', fuel: 'DIESEL', price_max_minor: 100000000 } }),
      )
      .mockResolvedValueOnce(reply(204, {}));

    expect((await listCarAlerts())[0]).toMatchObject({ id: 'a1', scope: 'ALL', make: null });
    const added = await createCarAlert({ make: 'Hyundai', fuel: 'DIESEL', bodyType: null, priceMaxMinor: 100000000 });
    expect(call(1)).toMatchObject({ method: 'POST', body: { scope: 'MATCH', make: 'Hyundai', fuel: 'DIESEL', price_max_minor: 100000000 } });
    expect(added).toMatchObject({ id: 'a2', make: 'Hyundai', fuel: 'DIESEL', priceMaxMinor: 100000000 });
    await deleteCarAlert('a2');
    expect(call(2)).toMatchObject({ method: 'DELETE' });
    expect(call(2).url).toMatch(/\/car-alerts\/a2$/);
  });
});

describe('self-inspection fee', () => {
  test('test gateway: the fee is started, completed, and paid once the server confirms it', async () => {
    global.fetch
      .mockResolvedValueOnce(
        reply(201, {
          payment: { payment_id: 'pay_1', provider_order_id: 'order_stub_1', key_id: 'rzp_test_stub', amount: { amount_minor: 49900 }, redirect_url: null },
        }),
      )
      .mockResolvedValueOnce(reply(200, { status: 'CAPTURED' }))
      .mockResolvedValueOnce(reply(200, { payment: { status: 'CAPTURED' } }));
    const phases = [];
    const paid = await payForSelfInspection('insp_1', { onPhase: p => phases.push(p) });
    expect(paid).toEqual({ result: 'paid', amountMinor: 49900 });
    expect(phases).toEqual(['starting', 'confirming']);
    expect(call(0).url).toMatch(/\/inspections\/insp_1\/pay$/);
    expect(call(0).headers['Idempotency-Key']).toBeTruthy();
    expect(call(1).url).toMatch(/\/inspections\/insp_1\/pay\/simulate$/);
    expect(call(2).url).toMatch(/\/payments\/pay_1$/);
  });

  test('payments switched off on the server: unavailable', async () => {
    global.fetch.mockResolvedValueOnce(reply(503, { error: { code: 'PAYMENTS_UNAVAILABLE', message: 'off' } }));
    expect((await payForSelfInspection('insp_1')).result).toBe('unavailable');
  });

  test('Garage: a captured self-inspection with its fee unpaid shows "Payment pending" and Complete payment', () => {
    const item = { inspection_id: 'insp_1', inspection_status: 'IN_PROGRESS', inspection_mode: 'M1' };
    expect(garagePhase(item)).toBe('resume_self');
    const phase = garagePhase({ ...item, self_inspection_payment_pending: true });
    expect(phase).toBe('payment_pending');
    expect(phaseBadge({ phase }).labelKey).toBe('garage.phase.paymentPending');
    expect(phaseAction({ phase })).toBe('pay');
  });
});

describe('a public call the server now wants signed in', () => {
  test('signed in: sent once more with the login instead of "Please sign in"', async () => {
    global.fetch
      .mockResolvedValueOnce(reply(401, { error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } }))
      .mockResolvedValueOnce(reply(200, { slots: [], payments_available: true }));
    const { request } = require('../src/api/client');
    await request('/inspection-bookings/slots', { auth: false });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(call(0).headers.Authorization).toBeUndefined();
    expect(call(1).headers.Authorization).toBe('Bearer access-1');
  });
});
