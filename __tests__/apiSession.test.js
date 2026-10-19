/**
 * Real API client + session against a fake backend (fetch is mocked).
 */
import { USE_REAL_API } from '../src/api/config';
import { ApiError, readCookie, request } from '../src/api/client';
import {
  endSession,
  getAccessToken,
  onSessionExpired,
  restoreSession,
  startSession,
} from '../src/api/session';
import { loadSession, saveSession } from '../src/api/tokenStorage';
import { sendLoginOtp, verifyLoginOtp } from '../src/api/services/auth.api';
import { getNotifications, markAllNotificationsRead } from '../src/api/services/notification.api';
import { initialRouteFor } from '../src/navigation/authRoutes';
import { ROUTES } from '../src/navigation/routes';

// A fetch Response look-alike.
const reply = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: name => headers[name.toLowerCase()] ?? null },
  text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

const apiError = (status, code, message = 'nope') => reply(status, { error: { code, message } });

const lastCall = () => fetch.mock.calls[fetch.mock.calls.length - 1];
const bodyOf = call => JSON.parse(call[1].body);

beforeAll(() => {
  USE_REAL_API.auth = true;
  USE_REAL_API.notifications = true;
});

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(async () => {
  await endSession();
  jest.useRealTimers();
});

afterAll(() => {
  USE_REAL_API.auth = false;
  USE_REAL_API.notifications = false;
});

const signIn = (accessToken = 'access-1', expiresIn = 900) =>
  startSession({ accessToken, expiresIn, refreshToken: 'refresh-1', user: { fullName: 'Raj' } });

describe('client', () => {
  test('sends JSON without cookies and returns the body', async () => {
    fetch.mockResolvedValueOnce(reply(200, { ok: true }));
    await expect(request('/ping', { method: 'POST', body: { a: 1 }, auth: false })).resolves.toEqual({ ok: true });

    const [url, init] = lastCall();
    expect(url).toMatch(/\/api\/v1\/ping$/);
    expect(init.credentials).toBe('omit');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(bodyOf(lastCall())).toEqual({ a: 1 });
  });

  test('backend errors keep their code and message; server errors get a friendly one', async () => {
    fetch.mockResolvedValueOnce(apiError(422, 'VALIDATION_ERROR', 'Enter a valid phone number.'));
    await expect(request('/x', { auth: false })).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Enter a valid phone number.',
    });

    fetch.mockResolvedValueOnce(apiError(500, 'INTERNAL', 'TypeError: x is undefined'));
    await expect(request('/x', { auth: false })).rejects.toMatchObject({
      message: 'Something went wrong on our side. Please try again in a moment.',
    });
  });

  test('no internet gives a clear message', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    const error = await request('/x', { auth: false }).catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.isNetworkError).toBe(true);
    expect(error.message).toMatch(/internet connection/);
  });

  test('a request that takes too long is stopped with a clear message', async () => {
    jest.useFakeTimers();
    fetch.mockImplementationOnce(
      (url, { signal }) =>
        new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
    );
    const pending = request('/slow', { auth: false, timeoutMs: 1000 }).catch(e => e);
    jest.advanceTimersByTime(1000);
    const error = await pending;
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toMatch(/longer than usual/);
  });

  test('idempotent requests carry an Idempotency-Key', async () => {
    fetch.mockResolvedValueOnce(reply(201, {}));
    await request('/offers', { method: 'POST', body: {}, auth: false, idempotent: true });
    expect(lastCall()[1].headers['Idempotency-Key']).toEqual(expect.any(String));
  });

  test('reads the refresh token from Set-Cookie', () => {
    const headers = {
      get: () => 'tg_refresh=abc.DEF_123; Path=/api/v1/auth; HttpOnly, tg_authed=1; Path=/',
    };
    expect(readCookie(headers, 'tg_refresh')).toBe('abc.DEF_123');
    expect(readCookie(headers, 'missing')).toBeNull();
  });
});

describe('auth service', () => {
  test('starts the OTP with an E.164 number', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, { otp_token: 'tok', expires_in: 300, resend_after: 30, request_id: 'r', dev_hint: '4321' }),
    );
    await expect(sendLoginOtp({ phone: '9000000002' })).resolves.toEqual({
      otpToken: 'tok',
      expiresIn: 300,
      resendAfter: 30,
      devHint: '4321',
    });
    expect(bodyOf(lastCall())).toEqual({ phone: '+919000000002' });
  });

  test('verify confirms age, keeps the refresh cookie and maps the inspector role', async () => {
    fetch.mockResolvedValueOnce(
      reply(
        200,
        {
          access_token: 'access-1',
          expires_in: 900,
          consent_required: false,
          user: {
            id: 'usr_1',
            phone_masked: '+91 •••••• 0002',
            name: 'Isha Inspector',
            email: null,
            email_verified: false,
            avatar_url: null,
            roles: ['inspector', 'consumer'],
          },
        },
        { 'set-cookie': 'tg_refresh=refresh-1; Path=/api/v1/auth; HttpOnly; SameSite=Strict' },
      ),
    );
    const result = await verifyLoginOtp({ phone: '9000000002', otpToken: 'tok', otp: '1234' });

    expect(bodyOf(lastCall())).toEqual({ otp_token: 'tok', code: '1234', age_confirmed: true });
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        consentRequired: false,
        user: expect.objectContaining({ fullName: 'Isha Inspector', role: 'inspector', contact: '9000000002' }),
      }),
    );
  });

  test('a wrong code shows the backend message', async () => {
    fetch.mockResolvedValueOnce(apiError(401, 'AUTH_OTP_INVALID', 'That code is not right.'));
    await expect(verifyLoginOtp({ phone: '9000000002', otpToken: 'tok', otp: '0000' })).rejects.toMatchObject({
      message: 'That code is not right.',
    });
  });
});

describe('session', () => {
  test('signed-in calls send the access token', async () => {
    await signIn();
    fetch.mockResolvedValueOnce(reply(200, { user: {} }));
    await request('/me');
    expect(lastCall()[1].headers.Authorization).toBe('Bearer access-1');
  });

  test('an expired token is refreshed once for parallel calls, and the new refresh token is saved', async () => {
    await signIn('old', 1); // expires within the safety margin
    fetch.mockImplementation(url => {
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve(
          reply(200, { access_token: 'access-2', expires_in: 900 }, { 'set-cookie': 'tg_refresh=refresh-2; Path=/' }),
        );
      }
      return Promise.resolve(reply(200, { ok: true }));
    });

    await Promise.all([request('/a'), request('/b'), request('/c')]);

    const refreshCalls = fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(bodyOf(refreshCalls[0])).toEqual({ refresh_token: 'refresh-1' });
    expect(lastCall()[1].headers.Authorization).toBe('Bearer access-2');
    expect(await loadSession()).toEqual(expect.objectContaining({ refreshToken: 'refresh-2' }));
  });

  test('when the server says the token expired, it refreshes and retries the call once', async () => {
    await signIn();
    fetch
      .mockResolvedValueOnce(apiError(401, 'AUTH_TOKEN_EXPIRED'))
      .mockResolvedValueOnce(reply(200, { access_token: 'access-2', expires_in: 900 }))
      .mockResolvedValueOnce(reply(200, { name: 'Raj' }));

    await expect(request('/me')).resolves.toEqual({ name: 'Raj' });
    expect(lastCall()[1].headers.Authorization).toBe('Bearer access-2');
  });

  test('a dead session signs the user out and tells the app', async () => {
    await signIn('old', 1);
    const expired = jest.fn();
    const stop = onSessionExpired(expired);
    fetch.mockResolvedValueOnce(apiError(401, 'AUTH_REFRESH_REUSE_DETECTED'));

    await expect(request('/me')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(await loadSession()).toBeNull();
    await expect(getAccessToken()).resolves.toBeNull();
    stop();
  });

  test('offline during refresh keeps the user signed in', async () => {
    await signIn('old', 1);
    const expired = jest.fn();
    const stop = onSessionExpired(expired);
    fetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(request('/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(expired).not.toHaveBeenCalled();
    expect(await loadSession()).toEqual(expect.objectContaining({ refreshToken: 'refresh-1' }));
    stop();
  });

  test('log out ends the session on the server in the background', async () => {
    await signIn();
    fetch.mockResolvedValueOnce(reply(204));
    await endSession({ remote: true });

    expect(lastCall()[0]).toMatch(/\/auth\/logout$/);
    expect(bodyOf(lastCall())).toEqual({ refresh_token: 'refresh-1' });
    expect(await loadSession()).toBeNull();
  });
});

describe('notifications service', () => {
  test('loads the signed-in user notifications and maps them', async () => {
    await signIn();
    fetch.mockResolvedValueOnce(
      reply(200, {
        items: [
          { id: 'n1', type: 'offer_received', title: 'New offer received', body: 'b', link: '/sell/l1', read: false, created_at: '2026-10-03T10:00:00.000Z' },
          { id: 'n2', type: 'report_ready', title: 'Report ready', body: 'b', link: null, read: true, created_at: '2026-10-03T12:00:00.000Z' },
        ],
        unread_count: 1,
      }),
    );
    const result = await getNotifications();

    expect(lastCall()[0]).toMatch(/\/api\/v1\/notifications$/);
    expect(lastCall()[1].headers.Authorization).toBe('Bearer access-1');
    expect(result.unreadCount).toBe(1);
    expect(result.items.map(i => i.id)).toEqual(['n2', 'n1']); // newest first
    expect(result.items[1]).toEqual(expect.objectContaining({ category: 'offers', unread: true }));
  });

  test('mark all read posts to /notifications/read', async () => {
    await signIn();
    fetch.mockResolvedValueOnce(reply(200, { marked: 3 }));
    await expect(markAllNotificationsRead()).resolves.toBe(3);
    expect(lastCall()[0]).toMatch(/\/notifications\/read$/);
    expect(lastCall()[1].method).toBe('POST');
  });
});

describe('app start', () => {
  test('signed out opens Intro the first time, then Login', async () => {
    expect(initialRouteFor(await restoreSession())).toEqual({ name: ROUTES.INTRO });
    expect(initialRouteFor(null, { introSeen: true })).toEqual({ name: ROUTES.LOGIN });
  });

  test('a saved session opens the right home without any network call', async () => {
    await saveSession({ refreshToken: 'r', user: { role: 'inspector' }, pending: null });
    expect(initialRouteFor(await restoreSession())).toEqual({ name: ROUTES.INSPECTOR_TABS });

    await saveSession({ refreshToken: 'r', user: { role: 'individual' }, pending: null });
    expect(initialRouteFor(await restoreSession())).toEqual({ name: ROUTES.MAIN_TABS });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('mid sign-up reopens Create Account', async () => {
    const pending = { needsConsent: true, needsProfile: true };
    await saveSession({ refreshToken: 'r', user: { contact: '9876543210' }, pending });
    expect(initialRouteFor(await restoreSession())).toEqual({
      name: ROUTES.COMPLETE_PROFILE,
      params: { phone: '9876543210', ...pending },
    });
  });
});
