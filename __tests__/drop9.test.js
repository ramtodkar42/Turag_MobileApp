/**
 * Backend drop (9), as the web: DigiLocker identity verification, its booking
 * rule, traffic challans, the automatic bank check and business interest.
 */
import {
  completeDigiLocker,
  getVerificationStatus,
  needsVerification,
  showManual,
  startDigiLocker,
} from '../src/api/services/verification.api';
import { registerBusinessInterest } from '../src/api/services/profile.api';
import { mapChallans } from '../src/api/mappers/challans';
import { isReturnUrl } from '../src/screens/profile/DigiLocker/useDigiLocker';
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
  return { url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined };
};
const dlRow = status => ({ verification_id: 'v1', status, method: 'DIGILOCKER', doc_type: 'AADHAAR', doc_masked: null });

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

describe('DigiLocker identity verification', () => {
  test('status comes with the ways offered; an older server means manual only', async () => {
    global.fetch
      .mockResolvedValueOnce(reply(200, { verification: dlRow('FAILED'), options: { manual: true, digilocker: true, manual_is_fallback: true } }))
      .mockResolvedValueOnce(reply(200, { verification: null }));
    const a = await getVerificationStatus();
    expect(a.verification).toMatchObject({ status: 'FAILED', method: 'DIGILOCKER', docMasked: '' });
    expect(a.options).toEqual({ manual: true, digilocker: true, manualIsFallback: true });
    const b = await getVerificationStatus();
    expect(b).toEqual({ verification: null, options: { manual: true, digilocker: false, manualIsFallback: false } });
  });

  test('start sends the consent and returns the DigiLocker page; complete finishes the own journey', async () => {
    global.fetch
      .mockResolvedValueOnce(reply(201, { verification: dlRow('INITIATED'), redirect_url: 'https://digilocker.example/x' }))
      .mockResolvedValueOnce(reply(200, { verification: { ...dlRow('APPROVED'), doc_masked: 'XXXX XXXX 1234', auto_verified: true } }));
    expect((await startDigiLocker()).redirectUrl).toBe('https://digilocker.example/x');
    expect(call(0)).toMatchObject({ method: 'POST', body: { consent: true } });
    expect(call(0).url).toMatch(/\/verification\/digilocker$/);
    const done = await completeDigiLocker();
    expect(call(1).url).toMatch(/\/verification\/digilocker\/complete$/);
    expect(done).toMatchObject({ status: 'APPROVED', autoVerified: true, docMasked: 'XXXX XXXX 1234' });
  });

  test('back on Turag from DigiLocker is recognised; other pages are not', () => {
    expect(isReturnUrl('https://turag.ai/account/verification/digilocker?code=1')).toBe(true);
    expect(isReturnUrl('https://turag.ai/account/verification/digilocker/')).toBe(true);
    expect(isReturnUrl('https://digilocker.gov.in/signin')).toBe(false);
  });

  test('manual upload: offered normally; in DigiLocker mode only after a DigiLocker try ended', () => {
    const manual = { manual: true, digilocker: false, manualIsFallback: false };
    const dlMode = { manual: true, digilocker: true, manualIsFallback: true };
    expect(showManual(null, manual)).toBe(true);
    expect(showManual(null, dlMode)).toBe(false);
    expect(showManual({ method: 'DIGILOCKER', status: 'EXPIRED' }, dlMode)).toBe(true);
    expect(showManual({ method: 'DIGILOCKER', status: 'INITIATED' }, dlMode)).toBe(false);
  });

  test('booking asks for the ID unless verified / in review - and never in DigiLocker mode', () => {
    const manual = { manualIsFallback: false };
    expect(needsVerification(null, manual)).toBe(true);
    expect(needsVerification({ status: 'PENDING_REVIEW' }, manual)).toBe(false);
    expect(needsVerification({ status: 'REJECTED' }, manual)).toBe(true);
    expect(needsVerification(null, { manualIsFallback: true })).toBe(false);
    expect(needsVerification(null)).toBe(true); // status unknown: shown (the web's safe default)
  });
});

describe('traffic challans', () => {
  test('found: count, total and each one in rupees; never checked: null', () => {
    const c = mapChallans({
      outcome: 'FOUND',
      pending_count: 2,
      total_fine_minor: 150000,
      currency: 'INR',
      checked_at: '2026-10-20T10:00:00Z',
      challans: [
        { challan_number: 'C1', violation: 'Over speeding', date: '2026-09-01', fine_minor: 100000, status: 'Pending', state: 'MH', issuing_authority: 'Pune Traffic' },
      ],
    });
    expect(c).toMatchObject({ outcome: 'FOUND', pendingCount: 2, totalFine: 1500 });
    expect(c.items[0]).toEqual({
      number: 'C1',
      violation: 'Over speeding',
      date: '2026-09-01',
      fine: 1000,
      status: 'Pending',
      authority: 'Pune Traffic, MH',
    });
    expect(mapChallans(null)).toBeNull();
  });
});

describe('business interest at sign-up', () => {
  test('a dealer / bank is sent to Turag’s team', async () => {
    global.fetch.mockResolvedValueOnce(reply(200, { whatsapp_queued: true }));
    expect(await registerBusinessInterest('DEALER')).toEqual({ whatsappQueued: true });
    expect(call(0)).toMatchObject({ method: 'POST', body: { kind: 'DEALER' } });
    expect(call(0).url).toMatch(/\/me\/business-interest$/);
  });
});

describe('Continue with Google', () => {
  const { supabaseTokenFrom } = require('../src/api/googleAuth');
  const { signInWithGoogle, linkGoogle } = require('../src/api/services/auth.api');

  test('the Supabase token is read from the return link; an error there is shown', () => {
    expect(supabaseTokenFrom('turag://auth/callback#access_token=abc&refresh_token=r&expires_in=3600')).toBe('abc');
    expect(() => supabaseTokenFrom('turag://auth/callback?error=access_denied&error_description=User+cancelled')).toThrow(
      'User cancelled',
    );
  });

  test('a known Google email signs straight in; an unknown one needs the phone first', async () => {
    global.fetch
      .mockResolvedValueOnce(
        reply(200, {
          status: 'SESSION',
          access_token: 'acc-g',
          refresh_token: 'ref-g',
          expires_in: 900,
          user: { id: 'u1', name: 'Raj', roles: ['consumer'], phone_masked: '+91XXXXXX3210', email: 'raj@gmail.com', email_verified: true },
          consent_required: false,
        }),
      )
      .mockResolvedValueOnce(reply(200, { status: 'NEEDS_PHONE', name: 'Asha', email: 'asha@gmail.com' }))
      .mockResolvedValueOnce(reply(200, { linked: true }));

    const signedIn = await signInWithGoogle('sb-1');
    expect(call(0)).toMatchObject({ method: 'POST', body: { supabase_access_token: 'sb-1' } });
    expect(call(0).url).toMatch(/\/auth\/google$/);
    expect(signedIn).toMatchObject({ status: 'SESSION', accessToken: 'acc-g', refreshToken: 'ref-g', user: { fullName: 'Raj' } });

    expect(await signInWithGoogle('sb-2')).toEqual({ status: 'NEEDS_PHONE', name: 'Asha', email: 'asha@gmail.com' });

    expect(await linkGoogle('sb-2')).toBe(true);
    expect(call(2).url).toMatch(/\/auth\/google\/link$/);
    expect(call(2).body).toEqual({ supabase_access_token: 'sb-2' });
  });
});
