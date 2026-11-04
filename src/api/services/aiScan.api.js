import { request } from '../client';
import { BACKEND_URL } from '../config';
import { ENDPOINTS } from '../endpoints';

// AI photo scans, read on Turag's server (the same prompts and results as the
// web's inspection scans). The app sends the photo with the user's login; the
// OpenAI key stays on the server. Signed-in only, and the server allows about
// 60 scans an hour per user: over that it answers 429 (RATE_LIMITED).
// Any failure (429, 502 the AI failed, 503 scanning is off) is thrown, and
// every caller falls back to typing the value in - a scan is never required.
// Results are suggestions: the user confirms or corrects them before saving.
// Photos: JPEG, long edge up to 1600 px (the pickers already do this).

// Reading a photo can take a while; longer than an ordinary call.
const SCAN_TIMEOUT_MS = 60000;
const JPEG = 'image/jpeg';

// The odometer is read by the vehicle-vision route (outside /api/v1).
const VEHICLE_VISION_URL = `${BACKEND_URL}/api/ai/vehicle-vision`;

// RC or chassis / VIN plate. kind: 'RC' | 'VIN' (the app's names).
// VIN -> { isVinPlate, vin, engineNumber, confidence (0-100) };
// RC -> { isRcDocument, registrationNumber, chassisNumber, engineNumber,
//   mfgYear, regDate, make, model, variant, fuel }. Not the document asked
//   for: isVinPlate / isRcDocument false (ask for a retake).
export const readIdentityPhoto = async (kind, imageBase64) => {
  const data = await request(ENDPOINTS.AI_IDENTITY_EXTRACT, {
    method: 'POST',
    body: { kind: kind === 'VIN' ? 'VIN_PLATE' : 'RC', image_base64: imageBase64, mime_type: JPEG },
    timeoutMs: SCAN_TIMEOUT_MS,
  });
  return data?.result ?? null;
};

// One walkaround photo's damage. context: { itemCode, itemLabel, answerType,
// shotHint, vehicle } - vehicle facts only (never the plate, chassis, owner or
// GPS). Returns { hasDamage, part, type, severity, confidence, partMinor,
// labourMinor, paintMinor, repairCostMinor, reasoning, cosmetic,
// promptVersion }; no damage -> severity NONE and all costs 0. Advisory only.
export const scanDamagePhoto = async (imageBase64, context = {}) => {
  const data = await request(ENDPOINTS.AI_DAMAGE_SCAN, {
    method: 'POST',
    body: { image_base64: imageBase64, mime_type: JPEG, context },
    timeoutMs: SCAN_TIMEOUT_MS,
  });
  return data?.result ?? null;
};

// The odometer's km from a dashboard photo, or null when it can't be read
// (no odometer seen, no number, or a development server answering with
// placeholder data). Never the trip meter.
export const readOdometerPhoto = async imageBase64 => {
  const data = await request(VEHICLE_VISION_URL, {
    method: 'POST',
    body: { imageBase64, mimeType: JPEG, mode: 'READ_ODOMETER' },
    timeoutMs: SCAN_TIMEOUT_MS,
  });
  const result = data?.result;
  if (data?.mock || !result?.odometer_detected || result.odometer_km == null) {
    return null;
  }
  return result.odometer_km;
};
