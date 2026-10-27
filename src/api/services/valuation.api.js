// Vehicle valuation ("Evaluate") + consumer self-inspection (M1) API.
// Real backend when USE_REAL_API.valuation is true (src/api/config.js), mock otherwise.
//
// Flow (same as the web app):
//   proposeVehicle (registry lookup, saves nothing) -> confirmVehicle ("yes, mine":
//   vehicle_id) -> estimateValuation INSTANT -> estimateValuation DECLARED
//   (km / owners / condition) -> self-inspection: startSelfInspection ->
//   uploadInspectionFile (documents + photos) -> recordInspectionAnswer ->
//   submitInspection -> estimateValuation DECLARED with the inspection.
import { ApiError, newIdempotencyKey, request } from '../client';
import { DIRECT_OPENAI_SCAN, UPLOAD_TIMEOUT_MS, USE_REAL_API } from '../config';
import { scanIdentityWithOpenAI } from './visionScan';
import { ENDPOINTS } from '../endpoints';
import { mapValuation, mapVehicle } from '../mappers/valuation';
import { sampleValuation, sampleVehicle } from '../mock/valuation';
import { newClientAssetId, putToUploadTarget, readFileForUpload } from '../upload';
import { normalizeRegNumber } from '../../utils/validators';
import { tNow } from '../../i18n';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.valuation;

// Lookup errors the user can act on.
const lookupError = e => {
  if (e instanceof ApiError && e.status === 404) {
    return new ApiError({ status: 404, code: 'NOT_FOUND', message: tNow('valuation.evaluate.notFound') });
  }
  if (e instanceof ApiError && e.status === 422) {
    return new ApiError({ status: 422, code: 'INVALID_PLATE', message: tNow('valuation.evaluate.invalidPlate') });
  }
  return e;
};

// Registry lookup for the "Is this your vehicle?" screen. Saves nothing.
// Sent signed-in (as the web): each lookup is a paid Surepass call, so the
// backend refuses anonymous ones ("Please sign in to continue").
export const proposeVehicle = async registrationNumber => {
  const plate = normalizeRegNumber(registrationNumber);
  if (!real()) {
    await wait(800);
    return { ...sampleVehicle, registrationNumber: plate };
  }
  try {
    const data = await request(ENDPOINTS.VEHICLE_PROPOSE, {
      method: 'POST',
      body: { registration_number: plate },
    });
    return mapVehicle(data, { registrationNumber: plate });
  } catch (e) {
    throw lookupError(e);
  }
};

// "Yes, this is my vehicle": saves the vehicle and returns it with its vehicleId.
export const confirmVehicle = async registrationNumber => {
  const plate = normalizeRegNumber(registrationNumber);
  if (!real()) {
    await wait(600);
    return { ...sampleVehicle, vehicleId: 'veh_mock_1', registrationNumber: plate };
  }
  try {
    const data = await request(ENDPOINTS.VEHICLE_CONFIRM, {
      method: 'POST',
      body: { registration_number: plate },
      // Signed in: the live server now refuses anonymous confirms
      // ("Please sign in to continue"), as it does the lookup (propose).
      idempotent: true,
    });
    return mapVehicle(data, { registrationNumber: plate });
  } catch (e) {
    throw lookupError(e);
  }
};

// Price estimate. stage: 'INSTANT' (vehicle only) | 'DECLARED' (+ usage / condition,
// optionally the submitted self-inspection).
// condition: 'GOOD' | 'FAIR' | 'POOR' (from the accident answer).
// Returns { ready: true, valuation } or { ready: false, reason } (no estimate yet).
export const estimateValuation = async ({
  vehicleId,
  stage,
  odometerKm,
  ownerCount,
  condition,
  inspectionId,
}) => {
  if (!real()) {
    await wait(700);
    return { ready: true, valuation: { ...sampleValuation, stage } };
  }
  const data = await request(ENDPOINTS.VALUATION_ESTIMATE, {
    method: 'POST',
    body: {
      vehicle_id: vehicleId,
      stage,
      odometer_km: odometerKm,
      owner_count: ownerCount,
      declared_condition: condition,
      inspection_id: inspectionId,
    },
    // inspection_id needs the signed-in owner; vehicle-only estimates don't.
    auth: !!inspectionId,
    timeoutMs: 45000, // the DECLARED estimate can take a while (AI model passes)
  });
  return data.status === 'READY'
    ? { ready: true, valuation: mapValuation(data.valuation) }
    : { ready: false, reason: data.reason };
};

// Checks a captured photo shows the requested angle. status: 'perfect' | 'incorrect'.
// The backend has no angle check yet (only the web app has one, inside its
// own server), so every photo is accepted; the mock keeps the "checking" pause.
export const checkPhotoAngle = async ({ angle, file }) => {
  if (!real()) {
    await wait(900);
  }
  return { angle, uri: file.uri, status: 'perfect' };
};

// --- Self-inspection (M1, cars) --------------------------------------------

// Starts the owner's self-inspection for a confirmed vehicle. Returns { inspectionId }.
// consent: the inspection-consent box the user ticked (InspectionConsent) - sent
// as it is, never a fixed "yes"; the backend refuses M1 without it.
export const startSelfInspection = async ({ vehicleId, category, consent }) => {
  if (!real()) {
    await wait(500);
    return { inspectionId: 'insp_mock_1' };
  }
  const data = await request(ENDPOINTS.INSPECTIONS, {
    method: 'POST',
    // DPDP inspection consent (as the web): the person ticked it before starting
    // the self-inspection (Privacy Policy §6.4). Required by the backend for M1.
    body: { vehicle_id: vehicleId, mode: 'M1', category, inspection_consent: consent === true },
  });
  return { inspectionId: data.inspection.id };
};

// A timeout, dropped connection or a gateway error from a cold server.
const isTransient = e =>
  e instanceof ApiError && (e.isNetworkError || [502, 503, 504].includes(e.status));

// Runs an upload step, and once more if it failed for a transient reason.
// The first upload after a quiet spell often fails like that (cold server +
// the photo is processed inside "complete"); the second try hits a warm server.
const withRetry = async step => {
  try {
    return await step();
  } catch (e) {
    if (!isTransient(e)) {
      throw e;
    }
    return step();
  }
};

// Is this exact file (by SHA-256) already uploaded to the inspection? Asked
// before uploading, as the web does. Fails open: if the check itself fails,
// the upload goes ahead (the backend's submit-time checks are the final word).
const isDuplicateFile = async (inspectionId, checksum) => {
  try {
    const data = await request(ENDPOINTS.mediaCheckDuplicate(inspectionId), {
      method: 'POST',
      body: { checksum_sha256: checksum },
    });
    return !!data?.duplicate;
  } catch {
    return false;
  }
};

export const DUPLICATE_FILE = 'DUPLICATE_FILE';

// Uploads one document / photo as evidence for a checklist item:
// hash + size -> (same file already uploaded? stop: DUPLICATE_FILE) ->
// request an upload target -> PUT the bytes -> complete.
// Every step is safe to repeat: request-upload is idempotent on
// client_asset_id (same id for the whole upload), the PUT rewrites the same
// object, and complete is idempotent, so a retry never adds a second photo.
// kind: 'DOCUMENT' | 'PHOTO'. gps (optional): { lat, lng, accuracyM? } where it was taken.
// Returns { mediaId, status }.
export const uploadInspectionFile = async ({ inspectionId, itemCode, shotCode, kind, file, gps }) => {
  if (!real()) {
    await wait(1000);
    return { mediaId: `med_mock_${shotCode}_${newClientAssetId().slice(3)}`, status: 'PROCESSED' };
  }
  const { blob, byteSize, checksum, contentType } = await readFileForUpload(file);
  if (await isDuplicateFile(inspectionId, checksum)) {
    throw new ApiError({
      code: DUPLICATE_FILE,
      message: tNow(kind === 'DOCUMENT' ? 'valuation.upload.duplicateDocument' : 'valuation.upload.duplicatePhoto'),
    });
  }
  const clientAssetId = newClientAssetId();
  const capturedAt = new Date().toISOString();
  const { media_id: mediaId, upload } = await withRetry(() =>
    request(ENDPOINTS.mediaRequestUpload(inspectionId), {
      method: 'POST',
      body: {
        item_code: itemCode,
        shot_code: shotCode,
        kind,
        content_type: contentType,
        byte_size: byteSize,
        checksum_sha256: checksum,
        client_asset_id: clientAssetId,
        captured_at: capturedAt,
        ...(gps
          ? {
              gps: {
                lat: gps.lat,
                lng: gps.lng,
                ...(gps.accuracyM != null ? { accuracy_m: gps.accuracyM } : {}),
              },
            }
          : {}),
      },
      timeoutMs: UPLOAD_TIMEOUT_MS,
    }),
  );
  await withRetry(() => putToUploadTarget(upload, blob));
  const done = await withRetry(() =>
    request(ENDPOINTS.mediaComplete(mediaId), { method: 'POST', timeoutMs: UPLOAD_TIMEOUT_MS }),
  );
  return { mediaId, status: done.media?.status ?? null };
};

// M1 VIN / RC photo reading (as the web's identity extraction cards).
export const extractInspectionIdentity = async (inspectionId, kind, imageBase64) => {
  // DEV: read the photo by calling OpenAI directly (staging has no extract route).
  if (DIRECT_OPENAI_SCAN) {
    return scanIdentityWithOpenAI(kind, imageBase64);
  }
  if (!real()) {
    await wait(800);
    return kind === 'VIN'
      ? { isVinPlate: true, vin: 'MA3JMT12345678901', engineNumber: null }
      : {
          isRcDocument: true,
          registrationNumber: 'MH12AB1234',
          chassisNumber: 'MA3JMT12345678901',
          engineNumber: 'K12MN1234567',
          make: 'Maruti Suzuki',
          model: 'Swift',
          variant: 'VXI',
          fuel: 'PETROL',
          mfgYear: 2020,
          regDate: '2020-08-14',
        };
  }
  const data = await request(ENDPOINTS.inspectionIdentityExtract(inspectionId), {
    method: 'POST',
    body: { kind, image_base64: imageBase64 },
    timeoutMs: 60000,
  });
  return data.result;
};

// Verify the user-CONFIRMED VIN / RC / plate reads against the vehicle's
// registry baseline (as the web's identity-verify). Returns per-field verdicts
// only: MATCH | MISMATCH | UNREADABLE | NOT_AVAILABLE, plus has_baseline. The
// plaintext values travel ONLY in this request body - never stored, never shown
// again. `evidence` holds the confirmed values; missing fields are sent null.
export const verifyInspectionIdentity = async (inspectionId, evidence = {}) => {
  if (!real()) {
    await wait(400);
    // Dev stub: no registry baseline linked, so everything is NOT_AVAILABLE.
    const na = key => [key, 'NOT_AVAILABLE'];
    return {
      ...Object.fromEntries(
        ['vin', 'engine_number', 'registration_number', 'make', 'model', 'variant', 'mfg_year', 'fuel', 'category', 'color'].map(na),
      ),
      has_baseline: false,
    };
  }
  const data = await request(ENDPOINTS.inspectionIdentityVerify(inspectionId), {
    method: 'POST',
    body: {
      vin: evidence.vin ?? null,
      engine_number: evidence.engineNumber ?? null,
      front_plate: evidence.frontPlate ?? null,
      rear_plate: evidence.rearPlate ?? null,
      make: evidence.make ?? null,
      model: evidence.model ?? null,
      variant: evidence.variant ?? null,
      mfg_year: evidence.mfgYear ?? null,
      fuel: evidence.fuel ?? null,
      category: evidence.category ?? null,
      color: evidence.color ?? null,
    },
    timeoutMs: 30000,
  });
  return data.verdicts;
};

// Deletes one uploaded photo / document (file + stored copies), e.g. the old
// one after it was replaced. Only while the inspection is still being captured
// (409 once it's submitted).
export const deleteInspectionFile = async mediaId => {
  if (!real()) {
    await wait(300);
    return;
  }
  await request(ENDPOINTS.media(mediaId), { method: 'DELETE' });
};

// Records one checklist answer (self-inspection and the inspector's M2).
// severity: 'OK' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL' | 'NOT_ASSESSABLE'
// (NOT_ASSESSABLE needs naReason); refurbCost: estimated repair in rupees.
export const recordInspectionAnswer = async ({
  inspectionId,
  itemCode,
  severity,
  numericValue,
  unit,
  note,
  naReason,
  refurbCost,
}) => {
  if (!real()) {
    await wait(150);
    return;
  }
  await request(ENDPOINTS.inspectionItem(inspectionId, itemCode), {
    method: 'PUT',
    body: {
      severity,
      // Only a real number: the backend refuses null (an answer loaded from an
      // earlier visit has none) - as the web, which leaves it out.
      numeric_value: typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : undefined,
      unit: unit || undefined,
      text_note: note || undefined,
      na_reason: severity === 'NOT_ASSESSABLE' ? naReason : undefined,
      refurb_cost_minor: refurbCost != null ? Math.round(refurbCost * 100) : undefined,
    },
  });
};

// Sends the self-inspection to Turag for review. Returns { status }.
export const submitInspection = async inspectionId => {
  if (!real()) {
    await wait(800);
    return { status: 'PENDING_QC' };
  }
  const data = await request(ENDPOINTS.inspectionSubmit(inspectionId), {
    method: 'POST',
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
  return { status: data.inspection?.status ?? null };
};
