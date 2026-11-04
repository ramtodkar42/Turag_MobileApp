/**
 * AI photo scans on Turag's server (no OpenAI key in the app): RC / VIN plate,
 * walkaround damage and the odometer, each sent with the user's login.
 */

import { readIdentityPhoto, readOdometerPhoto, scanDamagePhoto } from '../src/api/services/aiScan.api';
import { extractInspectionIdentity } from '../src/api/services/valuation.api';
import { endSession, startSession } from '../src/api/session';
import { BACKEND_URL, USE_REAL_API } from '../src/api/config';

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(JSON.stringify(body)),
});

const sent = (call = 0) => {
  const [url, init] = global.fetch.mock.calls[call];
  return { url, init, body: JSON.parse(init.body) };
};

let originalFetch;
beforeEach(async () => {
  originalFetch = global.fetch;
  global.fetch = jest.fn();
  await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
});
afterEach(async () => {
  global.fetch = originalFetch;
  await endSession();
});

test('VIN plate: /api/v1/ai/identity-extract with kind VIN_PLATE and the login', async () => {
  const result = { isVinPlate: true, vin: 'MA3EWB12345678901', engineNumber: null, confidence: 86 };
  global.fetch.mockResolvedValueOnce(reply(200, { kind: 'VIN_PLATE', result, request_id: 'req_1' }));
  expect(await readIdentityPhoto('VIN', 'BASE64')).toEqual(result);
  const { url, init, body } = sent();
  expect(url).toBe(`${BACKEND_URL}/api/v1/ai/identity-extract`);
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe('Bearer access-1');
  expect(body).toEqual({ kind: 'VIN_PLATE', image_base64: 'BASE64', mime_type: 'image/jpeg' });
});

test('RC (through the inspection screen call): kind RC, the read comes back as it is', async () => {
  const result = { isRcDocument: true, registrationNumber: 'MH12AB1234', make: 'Maruti Suzuki' };
  global.fetch.mockResolvedValueOnce(reply(200, { kind: 'RC', result }));
  const before = USE_REAL_API.valuation;
  USE_REAL_API.valuation = true;
  try {
    expect(await extractInspectionIdentity('ins_1', 'RC', 'BASE64')).toEqual(result);
  } finally {
    USE_REAL_API.valuation = before;
  }
  expect(sent().body.kind).toBe('RC');
});

test('damage: /api/v1/ai/damage-scan with the photo and its context', async () => {
  const result = { hasDamage: false, type: 'NONE', severity: 'NONE', repairCostMinor: 0 };
  global.fetch.mockResolvedValueOnce(reply(200, { result }));
  const context = { itemCode: 'B1', shotHint: 'WALK_FRONT_LEFT', vehicle: { make: 'Maruti Suzuki' } };
  expect(await scanDamagePhoto('BASE64', context)).toEqual(result);
  const { url, body } = sent();
  expect(url).toBe(`${BACKEND_URL}/api/v1/ai/damage-scan`);
  expect(body).toEqual({ image_base64: 'BASE64', mime_type: 'image/jpeg', context });
});

test('odometer: /api/ai/vehicle-vision READ_ODOMETER; only a detected km counts', async () => {
  global.fetch.mockResolvedValueOnce(
    reply(200, { success: true, result: { odometer_detected: true, odometer_km: 42180, trip_meter_values: [123] } }),
  );
  expect(await readOdometerPhoto('BASE64')).toBe(42180);
  const { url, init, body } = sent();
  expect(url).toBe(`${BACKEND_URL}/api/ai/vehicle-vision`);
  expect(init.headers.Authorization).toBe('Bearer access-1');
  expect(body).toEqual({ imageBase64: 'BASE64', mimeType: 'image/jpeg', mode: 'READ_ODOMETER' });

  // Not seen, no number, or a dev server's placeholder: no reading (type it in).
  global.fetch.mockResolvedValueOnce(reply(200, { success: true, result: { odometer_detected: false, odometer_km: null } }));
  expect(await readOdometerPhoto('BASE64')).toBeNull();
  global.fetch.mockResolvedValueOnce(reply(200, { success: true, mock: true, result: { odometer_detected: true } }));
  expect(await readOdometerPhoto('BASE64')).toBeNull();
});

test('over the hourly AI budget (429) or scanning off (503): an error, so the screen offers typing it in', async () => {
  global.fetch.mockResolvedValueOnce(reply(429, { error: { code: 'RATE_LIMITED', message: 'Too many scans' } }));
  await expect(readIdentityPhoto('RC', 'BASE64')).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
  global.fetch.mockResolvedValueOnce(reply(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'off' } }));
  await expect(scanDamagePhoto('BASE64')).rejects.toMatchObject({ status: 503 });
});
