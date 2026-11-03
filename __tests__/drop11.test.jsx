/**
 * Backend drop 11 in the app: the dealer email confirm step (202), mobile
 * number verification, a sale that completes (date + notification), and the
 * server's "Terms still owed" (on /me, and an action refused CONSENT_REQUIRED).
 * The dealer dashboard is in business.test.jsx.
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OTPInput } from '../src/components';
import { confirmPasswordLogin, loginWithPassword } from '../src/api/services/auth.api';
import { confirmPhoneVerification, getMe, startPhoneVerification } from '../src/api/services/profile.api';
import { request, setConsentHandler } from '../src/api/client';
import { endSession, startSession } from '../src/api/session';
import { USE_REAL_API } from '../src/api/config';
import { mapOrder } from '../src/api/mappers/offer';
import { mapNotification } from '../src/api/mappers/notification';
import { buildOfferTimeline } from '../src/screens/offers/OfferDetails/offerTimeline';
import MobileCard from '../src/screens/profile/PersonalInfo/components/MobileCard';
import usePhoneVerification from '../src/screens/profile/PersonalInfo/usePhoneVerification';

const reply = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: name => headers[name.toLowerCase()] ?? null },
  text: () => Promise.resolve(body == null ? '' : JSON.stringify(body)),
});
const sent = (i = 0) => {
  const [url, init] = fetch.mock.calls[i];
  return { url, init, body: init.body ? JSON.parse(init.body) : undefined };
};
const apiUser = { id: 'usr_1', phone_masked: '+91 98•••••210', name: 'Shree', email: 'd@shree.in', email_verified: true, phone_verified: false, avatar_url: null, roles: ['consumer', 'dealer'] };

beforeAll(() => {
  USE_REAL_API.auth = true;
});
afterAll(() => {
  USE_REAL_API.auth = false;
});
beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(async () => {
  setConsentHandler(null);
  await endSession();
});

describe('dealer email on an existing account (202, then /auth/password/confirm)', () => {
  test('a 202 is the confirm step, not a failed sign-in', async () => {
    fetch.mockResolvedValueOnce(
      reply(202, {
        confirmation_required: true,
        otp_token: 'otp_up',
        confirm_ticket: 'tk_1',
        phone_hint: '+91 98•••••210',
        expires_in: 300,
        dev_hint: '123456',
        request_id: 'r',
      }),
    );
    await expect(loginWithPassword({ email: ' d@shree.in ', password: 'p' })).resolves.toEqual({
      confirmationRequired: true,
      otpToken: 'otp_up',
      confirmTicket: 'tk_1',
      phoneHint: '+91 98•••••210',
      expiresIn: 300,
      devHint: '123456',
    });
  });

  test('the code signs in, the same as a password sign-in', async () => {
    fetch.mockResolvedValueOnce(
      reply(
        200,
        { access_token: 'acc', expires_in: 900, user: apiUser, consent_required: false, request_id: 'r' },
        { 'set-cookie': 'tg_refresh=refresh-9; Path=/; HttpOnly' },
      ),
    );
    const session = await confirmPasswordLogin({ email: 'd@shree.in ', otpToken: 'otp_up', confirmTicket: 'tk_1', code: ' 123456 ' });
    expect(sent().url).toMatch(/\/auth\/password\/confirm$/);
    expect(sent().body).toEqual({ email: 'd@shree.in', otp_token: 'otp_up', confirm_ticket: 'tk_1', code: '123456' });
    expect(session).toEqual(expect.objectContaining({ accessToken: 'acc', refreshToken: 'refresh-9', consentRequired: false }));
    expect(session.user).toEqual(expect.objectContaining({ fullName: 'Shree', phoneVerified: false }));
  });
});

describe('mobile number verification', () => {
  beforeEach(() => startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} }));

  test('sends a code by WhatsApp or SMS, then confirms it', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, { already_verified: false, otp_token: 'otp_p', expires_in: 300, resend_after: 45, dev_hint: '654321', request_id: 'r' }),
    );
    await expect(startPhoneVerification('sms')).resolves.toEqual({
      alreadyVerified: false,
      otpToken: 'otp_p',
      resendAfter: 45,
      devHint: '654321',
    });
    expect(sent().url).toMatch(/\/me\/phone-verification$/);
    expect(sent().body).toEqual({ channel: 'sms' });

    fetch.mockResolvedValueOnce(reply(200, { phone_verified: true, request_id: 'r' }));
    await confirmPhoneVerification({ otpToken: 'otp_p', code: ' 654321 ' });
    expect(sent(1).url).toMatch(/\/me\/phone-verification\/confirm$/);
    expect(sent(1).body).toEqual({ otp_token: 'otp_p', code: '654321' });
  });

  test('Profile card: Not verified -> Verify by WhatsApp -> code -> Verified', async () => {
    let verified = false;
    function Harness() {
      const phone = usePhoneVerification({ onVerified: () => (verified = true) });
      return <MobileCard mobile="+91 98•••••210" verified={verified} phone={phone} />;
    }
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
          <Harness />
        </SafeAreaProvider>,
      );
    });
    const root = tree.root;
    const text = value => root.findAll(n => n.props.children === value).length > 0;
    const tap = label =>
      act(async () =>
        root
          .findAll(n => n.props.onPress && n.findAll(c => c.props.children === label).length > 0)
          .slice(-1)[0]
          .props.onPress(),
      );
    expect(text('Not verified')).toBe(true);

    fetch.mockResolvedValueOnce(reply(200, { already_verified: false, otp_token: 'otp_p', resend_after: 30, request_id: 'r' }));
    await tap('Verify by WhatsApp');
    expect(sent().body).toEqual({ channel: 'whatsapp' });
    expect(text('Enter the code we sent on WhatsApp to +91 98•••••210.')).toBe(true);

    fetch.mockResolvedValueOnce(reply(401, { error: { code: 'AUTH_OTP_INVALID', message: 'x' } }));
    await act(async () => root.findByType(OTPInput).props.onChangeText('111111'));
    await tap('Verify');
    expect(text("That code isn't right. Please check it and try again.")).toBe(true);

    fetch.mockResolvedValueOnce(reply(200, { phone_verified: true, request_id: 'r' }));
    await act(async () => root.findByType(OTPInput).props.onChangeText('654321'));
    await tap('Verify');
    expect(verified).toBe(true);
    expect(text('Your mobile number is verified.')).toBe(true);
    act(() => tree.unmount());
  });
});

describe('a sale completes', () => {
  test('the completion date is read, shown on the last step; handed over says it waits for the RC transfer', () => {
    const base = { order_id: 'o1', listing_id: 'l1', offer_id: 'f1', agreed_price: 80000000, status: 'COMPLETED', handover_at: '2026-10-25T10:00:00Z' };
    const done = mapOrder({ ...base, completed_at: '2026-10-28T06:30:00Z' });
    expect(done.completedAt).toBe(Date.parse('2026-10-28T06:30:00Z'));
    const offer = { createdAt: 1, updatedAt: 2, status: 'ACCEPTED', history: [] };
    const doneSteps = buildOfferTimeline(offer, done);
    expect(doneSteps[doneSteps.length - 1]).toEqual(expect.objectContaining({ label: 'Completed', state: 'done' }));
    expect(doneSteps[doneSteps.length - 1].caption).toMatch(/28 Oct 2026/);

    const handed = buildOfferTimeline(offer, mapOrder({ ...base, status: 'HANDED_OVER', completed_at: null }));
    expect(handed[handed.length - 1]).toEqual({
      label: 'Completed',
      caption: 'Once the ownership (RC) transfer is done',
      state: 'pending',
    });
  });

  test('"order completed" is an offers notification with a tick', () => {
    const n = mapNotification({ id: 'n1', type: 'order_completed', title: 'Sale completed', body: '', link: '/sell/l1', read: false, created_at: '2026-10-28T06:30:00Z' });
    expect(n).toEqual(expect.objectContaining({ category: 'offers', icon: 'check' }));
  });
});

describe('Terms still owed (the server decides)', () => {
  beforeEach(() => startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} }));

  test('/me says so', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, { user: apiUser, member_since: '2026-01-01T00:00:00Z', consents_summary: [], consent_required: true, request_id: 'r' }),
    );
    await expect(getMe()).resolves.toEqual(expect.objectContaining({ consentRequired: true }));
  });

  test('an action refused with CONSENT_REQUIRED asks for the Terms, with a clear message', async () => {
    const ask = jest.fn();
    setConsentHandler(ask);
    fetch.mockResolvedValueOnce(reply(403, { error: { code: 'CONSENT_REQUIRED', message: 'consent required', request_id: 'r' } }));
    await expect(request('/listings', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
      message: "Please accept Turag's Terms and Privacy Policy to continue.",
    });
    expect(ask).toHaveBeenCalledTimes(1);
  });
});
