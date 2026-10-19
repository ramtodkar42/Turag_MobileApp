/**
 * Valuation + Garage services against a fake backend (fetch is mocked).
 */
/* eslint-env node */
import { BACKEND_URL, USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';
import {
  confirmVehicle,
  estimateValuation,
  proposeVehicle,
  recordInspectionAnswer,
  startSelfInspection,
  submitInspection,
  uploadInspectionFile,
} from '../src/api/services/valuation.api';
import { getGarage, saveVehicleToGarage } from '../src/api/services/garage.api';
import { base64ToBytes } from '../src/api/upload';

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
});

const urlOf = call => call[0];
const bodyOf = call => JSON.parse(call[1].body);
const headerOf = (call, name) => {
  const headers = call[1].headers ?? {};
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
};

// POST /vehicles/propose | /confirm response.
const vehicleData = (extra = {}) => ({
  make: 'Hyundai',
  model: 'Creta',
  variant_text: 'SX 1.5',
  mfg_year: 2022,
  fuel: 'DIESEL',
  category: 'PASSENGER',
  registry: {
    rc_city: 'Pune',
    rc_state: 'Maharashtra',
    owner_count: 2,
    color: 'POLAR_WHITE',
    body_type: 'SUV',
    engine_cc: 1493,
    seat_capacity: 5,
    registration_date: '2022-03-01',
    insurance_upto: '2026-03-01',
    pucc_upto: null,
  },
  ...extra,
});

const valuationOutput = {
  valuation_id: 'val_1',
  vehicle_id: 'veh_1',
  stage: 'DECLARED',
  headline: { value: 1150000_00, band: 'retail' },
  bands: {
    distress: { low: 900000_00, high: 950000_00 },
    auction: { low: 960000_00, high: 1000000_00 },
    trade_in: { low: 1000000_00, high: 1080000_00 },
    retail: { low: 1100000_00, high: 1200000_00 },
  },
  confidence: { level: 'MEDIUM' },
};

beforeAll(() => {
  USE_REAL_API.valuation = true;
});
afterAll(() => {
  USE_REAL_API.valuation = false;
});
beforeEach(() => {
  global.fetch = jest.fn();
});
afterEach(async () => {
  await endSession();
});

const signIn = () =>
  startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });

describe('vehicle lookup', () => {
  test('propose sends the plate (no sign-in) and maps the registry facts', async () => {
    fetch.mockResolvedValueOnce(reply(200, vehicleData()));
    const vehicle = await proposeVehicle('mh 12 ab 1234');

    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/vehicles\/propose$/);
    expect(init.method).toBe('POST');
    expect(bodyOf(fetch.mock.calls[0])).toEqual({ registration_number: 'MH12AB1234' });
    expect(headerOf(fetch.mock.calls[0], 'Authorization')).toBeUndefined();
    expect(vehicle).toEqual(
      expect.objectContaining({
        vehicleId: null,
        registrationNumber: 'MH12AB1234',
        make: 'Hyundai',
        variant: 'SX 1.5',
        year: 2022,
        fuelCode: 'DIESEL',
        fuel: 'Diesel',
        category: 'PASSENGER',
        rcCity: 'Pune',
        ownerCount: 2,
        color: 'Polar White',
        engineCc: 1493,
        seats: 5,
        pucUpto: null,
      }),
    );
  });

  test('404 = no registry record, 422 = invalid plate: readable messages', async () => {
    fetch.mockResolvedValueOnce(reply(404, { error: { code: 'NOT_FOUND', message: 'x' } }));
    await expect(proposeVehicle('MH12AB1234')).rejects.toMatchObject({
      status: 404,
      message: 'Could not find this vehicle. Please check the number.',
    });
    fetch.mockResolvedValueOnce(reply(422, { error: { code: 'VALIDATION', message: 'x' } }));
    await expect(proposeVehicle('MH12AB1234')).rejects.toMatchObject({
      status: 422,
      message: 'This registration number doesn’t look right. Please check it.',
    });
  });

  test('confirm returns the saved vehicle id and is idempotent', async () => {
    fetch.mockResolvedValueOnce(reply(201, vehicleData({ vehicle_id: 'veh_1' })));
    const vehicle = await confirmVehicle('MH12AB1234');
    expect(urlOf(fetch.mock.calls[0])).toMatch(/\/vehicles\/confirm$/);
    expect(headerOf(fetch.mock.calls[0], 'Idempotency-Key')).toBeTruthy();
    expect(vehicle.vehicleId).toBe('veh_1');
  });
});

describe('estimate', () => {
  test('READY maps paise to rupee price bands', async () => {
    fetch.mockResolvedValueOnce(reply(200, { status: 'READY', valuation: valuationOutput }));
    const result = await estimateValuation({
      vehicleId: 'veh_1',
      stage: 'DECLARED',
      odometerKm: 12000,
      ownerCount: 1,
      condition: 'GOOD',
    });
    expect(bodyOf(fetch.mock.calls[0])).toEqual({
      vehicle_id: 'veh_1',
      stage: 'DECLARED',
      odometer_km: 12000,
      owner_count: 1,
      declared_condition: 'GOOD',
    });
    expect(result).toEqual({
      ready: true,
      valuation: expect.objectContaining({
        valuationId: 'val_1',
        estimatedValue: 1150000,
        confidence: 'MEDIUM',
        priceBands: {
          distress: { min: 900000, max: 950000 },
          auction: { min: 960000, max: 1000000 },
          tradeIn: { min: 1000000, max: 1080000 },
          retail: { min: 1100000, max: 1200000 },
        },
      }),
    });
  });

  test('NOT_READY gives the reason instead of a valuation', async () => {
    fetch.mockResolvedValueOnce(reply(200, { status: 'NOT_READY', reason: 'NO_COMPARABLES' }));
    await expect(estimateValuation({ vehicleId: 'veh_1', stage: 'INSTANT' })).resolves.toEqual({
      ready: false,
      reason: 'NO_COMPARABLES',
    });
  });
});

describe('self-inspection', () => {
  beforeEach(async () => {
    await signIn();
  });

  test('start creates an M1 inspection for the vehicle', async () => {
    fetch.mockResolvedValueOnce(reply(201, { inspection: { id: 'insp_1', status: 'DRAFT' } }));
    await expect(startSelfInspection({ vehicleId: 'veh_1', category: 'PASSENGER' })).resolves.toEqual({
      inspectionId: 'insp_1',
    });
    const call = fetch.mock.calls[0];
    expect(urlOf(call)).toMatch(/\/inspections$/);
    expect(bodyOf(call)).toEqual({ vehicle_id: 'veh_1', mode: 'M1', category: 'PASSENGER' });
    expect(headerOf(call, 'Authorization')).toBe('Bearer access-1');
  });

  test('upload: hash + size -> upload target (relative = this backend) -> PUT -> complete', async () => {
    const bytes = Buffer.from('hello turag');
    const blob = { type: 'image/jpeg', b64: bytes.toString('base64') };
    global.FileReader = class {
      readAsDataURL(b) {
        this.result = `data:image/jpeg;base64,${b.b64}`;
        this.onload();
      }
    };
    fetch
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) }) // the local file
      .mockResolvedValueOnce(reply(200, { duplicate: false })) // not uploaded before
      .mockResolvedValueOnce(
        reply(201, {
          media_id: 'med_1',
          upload: {
            url: '/api/v1/media/dev-upload?token=t1',
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
          },
        }),
      )
      .mockResolvedValueOnce({ ok: true, status: 200 }) // PUT bytes
      .mockResolvedValueOnce(reply(200, { media: { id: 'med_1', status: 'PROCESSED' } }));

    const result = await uploadInspectionFile({
      inspectionId: 'insp_1',
      itemCode: 'B1',
      shotCode: 'WALK_FRONT',
      kind: 'PHOTO',
      file: { uri: '/data/photo.jpg' },
    });

    expect(urlOf(fetch.mock.calls[0])).toBe('file:///data/photo.jpg');
    const dupe = fetch.mock.calls[1];
    expect(urlOf(dupe)).toMatch(/\/inspections\/insp_1\/media\/check-duplicate$/);
    expect(bodyOf(dupe)).toEqual({ checksum_sha256: require('crypto').createHash('sha256').update(bytes).digest('hex') });
    const ask = fetch.mock.calls[2];
    expect(urlOf(ask)).toMatch(/\/inspections\/insp_1\/media\/request-upload$/);
    expect(bodyOf(ask)).toEqual(
      expect.objectContaining({
        item_code: 'B1',
        shot_code: 'WALK_FRONT',
        kind: 'PHOTO',
        content_type: 'image/jpeg',
        byte_size: bytes.length,
        checksum_sha256: require('crypto').createHash('sha256').update(bytes).digest('hex'),
        client_asset_id: expect.stringMatching(/^ca_/),
      }),
    );
    const put = fetch.mock.calls[3];
    expect(urlOf(put)).toBe(`${BACKEND_URL}/api/v1/media/dev-upload?token=t1`);
    expect(put[1]).toEqual(
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob }),
    );
    expect(urlOf(fetch.mock.calls[4])).toMatch(/\/media\/med_1\/complete$/);
    expect(result).toEqual({ mediaId: 'med_1', status: 'PROCESSED' });
    delete global.FileReader;
  });

  test('upload: a cold-server failure (504 / dropped connection) is retried once with the same asset id', async () => {
    const bytes = Buffer.from('hello turag');
    const blob = { type: 'image/jpeg', b64: bytes.toString('base64') };
    global.FileReader = class {
      readAsDataURL(b) {
        this.result = `data:image/jpeg;base64,${b.b64}`;
        this.onload();
      }
    };
    const target = { media_id: 'med_1', upload: { url: 'https://store/x', method: 'PUT' } };
    fetch
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) }) // the local file
      .mockResolvedValueOnce(reply(200, { duplicate: false }))
      .mockRejectedValueOnce(new TypeError('Network request failed')) // request-upload, cold
      .mockResolvedValueOnce(reply(201, target)) // request-upload, retried
      .mockResolvedValueOnce({ ok: true, status: 200 }) // PUT bytes
      .mockResolvedValueOnce(reply(504, {})) // complete, cold server timed out
      .mockResolvedValueOnce(reply(200, { media: { id: 'med_1', status: 'PROCESSED' } }));

    const result = await uploadInspectionFile({
      inspectionId: 'insp_1',
      itemCode: 'B1',
      shotCode: 'WALK_FRONT',
      kind: 'PHOTO',
      file: { uri: '/data/photo.jpg' },
    });

    expect(fetch).toHaveBeenCalledTimes(7);
    expect(bodyOf(fetch.mock.calls[3]).client_asset_id).toBe(bodyOf(fetch.mock.calls[2]).client_asset_id);
    expect(urlOf(fetch.mock.calls[6])).toMatch(/\/media\/med_1\/complete$/);
    expect(result).toEqual({ mediaId: 'med_1', status: 'PROCESSED' });
    delete global.FileReader;
  });

  test('upload: the same file already on the inspection is stopped before anything is sent', async () => {
    const blob = { type: 'image/jpeg', b64: Buffer.from('same photo').toString('base64') };
    global.FileReader = class {
      readAsDataURL(b) {
        this.result = `data:image/jpeg;base64,${b.b64}`;
        this.onload();
      }
    };
    fetch
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce(reply(200, { duplicate: true }));

    await expect(
      uploadInspectionFile({ inspectionId: 'insp_1', itemCode: 'B1', shotCode: 'WALK_REAR', kind: 'PHOTO', file: { uri: '/data/p.jpg' } }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_FILE', message: 'This photo is already uploaded. Please take a new one.' });
    expect(fetch).toHaveBeenCalledTimes(2); // no request-upload, no bytes sent
    delete global.FileReader;
  });

  test('upload: if the duplicate check itself fails, the upload still goes ahead', async () => {
    const blob = { type: 'application/pdf', b64: Buffer.from('%PDF-1.7').toString('base64') };
    global.FileReader = class {
      readAsDataURL(b) {
        this.result = `data:application/pdf;base64,${b.b64}`;
        this.onload();
      }
    };
    fetch
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce(reply(500, {})) // check-duplicate down
      .mockResolvedValueOnce(reply(201, { media_id: 'med_2', upload: { url: 'https://store/y', method: 'PUT' } }))
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce(reply(200, { media: { id: 'med_2', status: 'UPLOADED' } }));

    const result = await uploadInspectionFile({
      inspectionId: 'insp_1',
      itemCode: 'P3',
      shotCode: 'INSURANCE_POLICY',
      kind: 'DOCUMENT',
      file: { uri: 'file:///cache/policy.pdf', type: 'application/pdf' },
    });
    expect(bodyOf(fetch.mock.calls[2])).toEqual(expect.objectContaining({ kind: 'DOCUMENT', content_type: 'application/pdf' }));
    expect(result).toEqual({ mediaId: 'med_2', status: 'UPLOADED' });
    delete global.FileReader;
  });

  test('upload: a real error (e.g. 422) is not retried', async () => {
    const blob = { type: 'image/jpeg', b64: Buffer.from('x').toString('base64') };
    global.FileReader = class {
      readAsDataURL(b) {
        this.result = `data:image/jpeg;base64,${b.b64}`;
        this.onload();
      }
    };
    fetch
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce(reply(200, { duplicate: false }))
      .mockResolvedValueOnce(reply(422, { error: { code: 'VALIDATION', message: 'Bad file' } }));

    await expect(
      uploadInspectionFile({
        inspectionId: 'insp_1',
        itemCode: 'B1',
        shotCode: 'WALK_FRONT',
        kind: 'PHOTO',
        file: { uri: '/data/photo.jpg' },
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(fetch).toHaveBeenCalledTimes(3);
    delete global.FileReader;
  });

  test('answers are PUT per item; submit sends an Idempotency-Key', async () => {
    fetch
      .mockResolvedValueOnce(reply(200, { item: {} }))
      .mockResolvedValueOnce(reply(200, { inspection: { id: 'insp_1', status: 'PENDING_QC' } }));

    await recordInspectionAnswer({
      inspectionId: 'insp_1',
      itemCode: 'O1',
      severity: 'OK',
      numericValue: 12000,
      unit: 'km',
    });
    const put = fetch.mock.calls[0];
    expect(urlOf(put)).toMatch(/\/inspections\/insp_1\/items\/O1$/);
    expect(put[1].method).toBe('PUT');
    expect(bodyOf(put)).toEqual({ severity: 'OK', numeric_value: 12000, unit: 'km' });

    await expect(submitInspection('insp_1')).resolves.toEqual({ status: 'PENDING_QC' });
    const submit = fetch.mock.calls[1];
    expect(urlOf(submit)).toMatch(/\/inspections\/insp_1\/submit$/);
    expect(headerOf(submit, 'Idempotency-Key')).toBeTruthy();
  });
});

describe('garage', () => {
  beforeEach(async () => {
    await signIn();
  });

  const saved = (id, extra = {}) => ({
    id,
    vehicle_id: 'veh_1',
    valuation_id: 'val_1',
    inspection_id: null,
    inspection_status: null,
    listing_id: null,
    listing_status: null,
    vehicle: { make: 'Hyundai', model: 'Creta', mfg_year: 2022, fuel: 'DIESEL', category: 'PASSENGER' },
    headline: { value: 1150000_00, band: 'retail' },
    created_at: '2026-10-01T10:00:00Z',
    ...extra,
  });

  test('list maps each saved vehicle with its inspection status', async () => {
    fetch.mockResolvedValueOnce(
      reply(200, {
        items: [
          saved('sv_1'),
          saved('sv_2', { inspection_id: 'insp_1', inspection_status: 'PENDING_QC' }),
          saved('sv_3', { inspection_status: 'VERIFIED', listing_id: 'lst_1', headline: null }),
        ],
      }),
    );
    const items = await getGarage();
    expect(urlOf(fetch.mock.calls[0])).toMatch(/\/saved-vehicles$/);
    expect(items.map(v => v.status)).toEqual(['not_inspected', 'in_review', 'verified']);
    expect(items[0]).toEqual(
      expect.objectContaining({
        id: 'sv_1',
        make: 'Hyundai',
        year: 2022,
        fuel: 'Diesel',
        estimatedValue: 1150000,
        savedOn: '2026-10-01',
        listed: false,
      }),
    );
    expect(items[2]).toEqual(expect.objectContaining({ listed: true, estimatedValue: null }));
  });

  test('save posts the vehicle and its valuation', async () => {
    fetch.mockResolvedValueOnce(reply(201, { saved_vehicle: saved('sv_1') }));
    const result = await saveVehicleToGarage({
      vehicle: { vehicleId: 'veh_1' },
      valuation: { valuationId: 'val_1' },
    });
    const call = fetch.mock.calls[0];
    expect(bodyOf(call)).toEqual({ vehicle_id: 'veh_1', valuation_id: 'val_1' });
    expect(headerOf(call, 'Idempotency-Key')).toBeTruthy();
    expect(result.id).toBe('sv_1');

    // No estimate yet: just the vehicle.
    fetch.mockResolvedValueOnce(reply(201, { saved_vehicle: saved('sv_2', { valuation_id: null }) }));
    await saveVehicleToGarage({ vehicle: { vehicleId: 'veh_1' }, valuation: null });
    expect(bodyOf(fetch.mock.calls[1])).toEqual({ vehicle_id: 'veh_1' });
  });
});

test('base64 decoder matches Node for every padding length', () => {
  for (const size of [0, 1, 2, 3, 4, 255, 1001]) {
    const bytes = require('crypto').randomBytes(size);
    expect(Buffer.from(base64ToBytes(bytes.toString('base64'))).equals(bytes)).toBe(true);
  }
});
