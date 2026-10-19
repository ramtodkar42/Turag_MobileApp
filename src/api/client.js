import { tNow } from '../i18n';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { getOnline, reportOffline, reportOnline } from '../store/networkStore';

// The one place that talks to the Turag backend. Services call `request()`;
// screens never use fetch directly.
//
// - JSON in / JSON out; backend errors ({ error: { code, message } }) become ApiError.
// - Signed-in calls get "Authorization: Bearer <access token>". When the token has
//   expired, the session refreshes it once and the call is retried, so the user
//   never sees it.
// - Every call has a time limit, and network problems get a clear message.
// - `idempotent: true` adds an Idempotency-Key so a retried "create" is not doubled;
//   pass `idempotencyKey` (newIdempotencyKey()) to reuse one key across user retries.
// - Cookies are never used (`credentials: 'omit'`): tokens live in the keychain.

export const ERROR_CODES = {
  NETWORK: 'NETWORK_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REFRESH_REUSE_DETECTED: 'AUTH_REFRESH_REUSE_DETECTED',
  RATE_LIMITED: 'RATE_LIMITED',
};

// App-made messages, in the user's language (read when the error happens).
const MESSAGES = {
  get network() {
    return tNow('errors.network');
  },
  get timeout() {
    return tNow('errors.timeout');
  },
  get server() {
    return tNow('errors.server');
  },
  get rateLimited() {
    return tNow('errors.rateLimited');
  },
  get signIn() {
    return tNow('errors.signIn');
  },
  get generic() {
    return tNow('errors.generic');
  },
};

export class ApiError extends Error {
  constructor({ status = 0, code, message, requestId, details }) {
    super(message || MESSAGES.generic);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }

  // The session can't be used any more (sign in again), as opposed to a network blip.
  get isAuthError() {
    return this.status === 401;
  }

  get isNetworkError() {
    return this.code === ERROR_CODES.NETWORK || this.code === ERROR_CODES.TIMEOUT;
  }
}

// Set by the session (src/api/session.js) so this file doesn't depend on it.
// { getAccessToken(): Promise<string|null>, refreshAccessToken(): Promise<string|null> }
let authHandler = null;
export const setAuthHandler = handler => {
  authHandler = handler;
};

const RETRY_WITH_NEW_TOKEN = new Set([ERROR_CODES.AUTH_TOKEN_EXPIRED, ERROR_CODES.AUTH_TOKEN_INVALID]);

export const newIdempotencyKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const parseBody = async res => {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const toApiError = (status, data) => {
  const err = data?.error ?? {};
  let message = err.message;
  if (status >= 500) {
    // Server-side details are not useful to the user.
    message = MESSAGES.server;
  } else if (status === 429) {
    message = err.message || MESSAGES.rateLimited;
  } else if (status === 401 && !message) {
    message = MESSAGES.signIn;
  }
  return new ApiError({
    status,
    code: err.code,
    message,
    requestId: err.request_id,
    details: err.details,
  });
};

async function send(path, { method, body, headers, token, timeoutMs }) {
  // Known offline: fail straight away instead of waiting out the full timeout.
  if (!getOnline()) {
    throw new ApiError({ code: ERROR_CODES.NETWORK, message: MESSAGES.network });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (e) {
    const timedOut = controller.signal.aborted;
    // A real network failure (not a timeout) means we're offline.
    if (!timedOut) {
      reportOffline();
    }
    throw new ApiError({
      code: timedOut ? ERROR_CODES.TIMEOUT : ERROR_CODES.NETWORK,
      message: timedOut ? MESSAGES.timeout : MESSAGES.network,
    });
  } finally {
    clearTimeout(timer);
  }

  // Got a response from the server: we're online.
  reportOnline();
  const data = await parseBody(res);
  if (!res.ok) {
    throw toApiError(res.status, data);
  }
  return { data, headers: res.headers, status: res.status };
}

// request(path, { method, body, auth = true, idempotent, idempotencyKey, headers, timeoutMs, raw })
// Returns the parsed JSON body, or { data, headers, status } when `raw` is true.
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    auth = true,
    idempotent = false,
    idempotencyKey,
    headers: extraHeaders,
    timeoutMs = REQUEST_TIMEOUT_MS,
    raw = false,
  } = options;

  const key = idempotencyKey ?? (idempotent ? newIdempotencyKey() : null);
  const headers = key ? { 'Idempotency-Key': key, ...extraHeaders } : extraHeaders;
  const call = token => send(path, { method, body, headers, token, timeoutMs });

  let token = null;
  if (auth) {
    token = await authHandler?.getAccessToken();
    if (!token) {
      throw new ApiError({ status: 401, code: ERROR_CODES.AUTH_REQUIRED, message: MESSAGES.signIn });
    }
  }

  let result;
  try {
    result = await call(token);
  } catch (e) {
    // Access token expired between our check and the server's: refresh once and retry.
    if (!auth || !(e instanceof ApiError) || e.status !== 401 || !RETRY_WITH_NEW_TOKEN.has(e.code)) {
      throw e;
    }
    const fresh = await authHandler?.refreshAccessToken();
    if (!fresh) {
      throw e;
    }
    result = await call(fresh);
  }
  return raw ? result : result.data;
}

// Reads one cookie value from a response's Set-Cookie header(s).
// The backend sends the refresh token as a cookie (meant for browsers); the app
// reads it here and keeps it in the keychain instead.
export const readCookie = (headers, name) => {
  const header = headers?.get?.('set-cookie');
  if (!header) {
    return null;
  }
  const match = header.match(new RegExp(`(?:^|[\\s,;])${name}=([^;,\\s]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : null;
};
