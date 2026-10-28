/**
 * Forgot password and Delete account against the live server's own replies
 * (captured from turag.ai on 2026-10-28 with a made-up email / no sign-in).
 */
import { requestPasswordReset, resetPassword } from '../src/api/services/auth.api';
import { deleteMyAccount } from '../src/api/services/profile.api';
import { endSession, startSession } from '../src/api/session';
import { loadSession } from '../src/api/tokenStorage';
import { USE_REAL_API } from '../src/api/config';

// jest.setup puts every feature on mock data; these talk to the (fake) server.
beforeAll(() => {
  USE_REAL_API.auth = true;
});
afterAll(() => {
  USE_REAL_API.auth = false;
});

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(body == null ? '' : JSON.stringify(body)),
});
const sent = () => {
  const [url, init] = fetch.mock.calls[0];
  return { url, init, body: init.body ? JSON.parse(init.body) : undefined };
};

beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(async () => {
  await endSession();
});

describe('Forgot password (POST /auth/password/forgot, /reset)', () => {
  test('asks for a code without a login and reads the live reply', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, { otp_token: 'otp_01M60T6Y68P2ZX2SCF9TBWCAGC', expires_in: 300, resend_after: 60, request_id: 'r1' }),
    );
    await expect(requestPasswordReset('  dealer@shree.in ')).resolves.toEqual({
      otpToken: 'otp_01M60T6Y68P2ZX2SCF9TBWCAGC',
      resendAfter: 60,
    });
    const { url, init, body } = sent();
    expect(url).toMatch(/\/auth\/password\/forgot$/);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBeUndefined();
    expect(body).toEqual({ identifier: 'dealer@shree.in' });
  });

  test('a wrong code (401 AUTH_OTP_INVALID) is just an error: no retry, no sign-out', async () => {
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
    fetch.mockResolvedValueOnce(
      reply(401, { error: { code: 'AUTH_OTP_INVALID', message: 'That code is incorrect. Please try again.', request_id: 'r2' } }),
    );
    await expect(resetPassword({ otpToken: 'otp_1', code: '000000', password: 'test-pass-123' })).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_OTP_INVALID',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sent().body).toEqual({ otp_token: 'otp_1', code: '000000', password: 'test-pass-123' });
    expect(sent().init.headers.Authorization).toBeUndefined();
    expect(await loadSession()).not.toBeNull();
  });

  test('the right code: 204, nothing else needed', async () => {
    fetch.mockResolvedValueOnce(reply(204, null));
    await expect(resetPassword({ otpToken: 'otp_1', code: '123456', password: 'new-pass-123' })).resolves.toBeDefined();
  });
});

describe('Razorpay checkout errors are never shown raw', () => {
  const { checkoutErrorMessage } = require('../src/api/razorpay');

  test('a declined payment (the JSON Razorpay sent on a phone, 2026-10-28)', () => {
    const message = checkoutErrorMessage({
      code: 0,
      description:
        '{"error":{"code":"BAD_REQUEST_ERROR","description":"undefined","source":"customer","step":"payment_authentication","reason":"payment_error","metadata":{}}}',
    });
    expect(message).toMatch(/^Your bank or UPI app didn’t approve it\./);
    expect(message).not.toMatch(/BAD_REQUEST_ERROR|\{/);
  });

  test('closed by the payer, or no internet', () => {
    const closed = 'You closed the payment page, so nothing was charged. Tap Pay when you’re ready.';
    expect(checkoutErrorMessage({ code: 0, description: 'Payment Cancelled' })).toBe(closed);
    expect(
      checkoutErrorMessage({ code: 0, description: '{"error":{"code":"BAD_REQUEST_ERROR","reason":"payment_cancelled"}}' }),
    ).toBe(closed);
    expect(checkoutErrorMessage({ code: 2, description: 'Network error' })).toBe(
      'The payment page didn’t open. Check your internet and tap Pay again.',
    );
  });

  test('every failure becomes a notice card: { kind, message }', () => {
    const { ApiError } = require('../src/api/client');
    const { PAYMENT_CANCELLED, paymentProblem } = require('../src/api/razorpay');
    expect(
      paymentProblem(new ApiError({ code: PAYMENT_CANCELLED, message: 'declined text', details: { kind: 'declined' } })),
    ).toEqual({ kind: 'declined', message: 'declined text' });
    expect(paymentProblem(new ApiError({ status: 502 }))).toEqual({
      kind: 'failed',
      message: 'Payment didn’t go through. Tap Pay again to retry.',
    });
  });
});

describe('PaymentNotice card', () => {
  const React = require('react');
  const ReactTestRenderer = require('react-test-renderer');
  const { PaymentNotice } = require('../src/components');

  test('a title for the kind and the message, no red error text', () => {
    let tree;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(PaymentNotice, { problem: { kind: 'declined', message: 'Try another way to pay.' } }),
      );
    });
    const texts = tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);
    expect(texts).toEqual(expect.arrayContaining(['Payment not approved', 'Try another way to pay.']));
    ReactTestRenderer.act(() => tree.unmount());
  });
});

describe('Delete account (DELETE /me)', () => {
  test('sends the typed DELETE with the login', async () => {
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
    fetch.mockResolvedValueOnce(reply(204, null));
    await deleteMyAccount();
    const { url, init, body } = sent();
    expect(url).toMatch(/\/me$/);
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bearer access-1');
    expect(body).toEqual({ confirm: 'DELETE' });
  });

  test('blocked by an open order: the server’s own message comes through', async () => {
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
    const message =
      'Your account still has an order, payout, inspection booking or payment in progress. Finish or cancel it, then delete your account.';
    fetch.mockResolvedValueOnce(
      reply(409, { error: { code: 'ACCOUNT_DELETION_BLOCKED', message, request_id: 'r3', details: { blockers: ['ORDER'] } } }),
    );
    await expect(deleteMyAccount()).rejects.toMatchObject({ status: 409, code: 'ACCOUNT_DELETION_BLOCKED', message });
    expect(await loadSession()).not.toBeNull(); // still signed in
  });
});
