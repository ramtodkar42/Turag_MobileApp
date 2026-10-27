// Identity verification (as the web's verification-client, ADR-0041). Two ways,
// whichever the server offers (`options`):
//  - DigiLocker: the user shares their Aadhaar from DigiLocker; approved at once.
//  - Manual: a government ID (Aadhaar, PAN or Driving Licence) - its number, a
//    photo of it and a selfie - reviewed later by Turag's team.
// It never holds up a booking. The number is encrypted on the server and only
// ever comes back masked ("XXXX XXXX 1234").
import { request } from '../client';
import { UPLOAD_TIMEOUT_MS } from '../config';
import { ENDPOINTS } from '../endpoints';

// Backend verification -> { id, status ('INITIATED' | 'PENDING_REVIEW' |
//   'APPROVED' | 'REJECTED' | 'FAILED' | 'EXPIRED'), method ('MANUAL' |
//   'DIGILOCKER'), docType, docMasked, autoVerified, failureReason,
//   rejectionReason, submittedAt }
const mapVerification = v => ({
  id: v.verification_id,
  status: v.status,
  method: v.method ?? 'MANUAL',
  docType: v.doc_type,
  docMasked: v.doc_masked ?? '',
  autoVerified: !!v.auto_verified,
  failureReason: v.failure_reason ?? null,
  rejectionReason: v.rejection_reason ?? null,
  submittedAt: v.submitted_at ?? null,
});

// Which ways to verify this server offers. Older servers send none: manual only.
const MANUAL_ONLY = { manual: true, digilocker: false, manualIsFallback: false };
const mapOptions = o =>
  o ? { manual: !!o.manual, digilocker: !!o.digilocker, manualIsFallback: !!o.manual_is_fallback } : MANUAL_ONLY;

// The signed-in user's verification and the ways offered:
// { verification (null if never started), options }.
export const getVerificationStatus = async () => {
  const data = await request(ENDPOINTS.VERIFICATION);
  return {
    verification: data?.verification ? mapVerification(data.verification) : null,
    options: mapOptions(data?.options),
  };
};

// The signed-in user's verification, or null if they never started one.
export const getMyVerification = async () => (await getVerificationStatus()).verification;

// A DigiLocker journey that ended without sharing (try again / upload instead).
export const isEnded = v => v?.status === 'FAILED' || v?.status === 'EXPIRED';

// Manual upload is offered when the server allows it - and where it's only the
// fallback (DigiLocker mode), once a DigiLocker try has ended.
export const showManual = (verification, options) =>
  options.manual && (!options.manualIsFallback || (verification?.method === 'DIGILOCKER' && isEnded(verification)));

// As the web's booking: the ID step is shown unless the user is already
// verified or has one waiting for review (never asked to send it twice) - and
// never in DigiLocker mode (leaving for DigiLocker would abandon the booking;
// they verify from Profile instead). If the status can't be read, it's shown.
export const needsVerification = (verification, options) =>
  !(verification && (verification.status === 'APPROVED' || verification.status === 'PENDING_REVIEW')) &&
  !options?.manualIsFallback;

// Starts (or resumes) a DigiLocker journey; consent is required. Returns
// { verification, redirectUrl } - the DigiLocker page to open.
// Errors: 409 already verified, 422 KYC_METHOD_UNAVAILABLE, 503 provider down.
export const startDigiLocker = async () => {
  const data = await request(ENDPOINTS.DIGILOCKER_START, { method: 'POST', body: { consent: true } });
  return { verification: mapVerification(data.verification), redirectUrl: data.redirect_url };
};

// Back from DigiLocker: finishes the user's own open journey (the server finds
// it by the login, never by the URL). Returns the verification: APPROVED,
// FAILED, EXPIRED, or still INITIATED while DigiLocker hasn't reported yet.
export const completeDigiLocker = async () =>
  mapVerification((await request(ENDPOINTS.DIGILOCKER_COMPLETE, { method: 'POST', body: {} })).verification);

// Submits the ID (multipart, as the web). docType: 'AADHAAR' | 'PAN' |
// 'DRIVING_LICENCE'; docNumber as typed (the server normalises it); selfie /
// docImage: picked photos ({ uri, type, fileName }). Returns the verification.
// Errors: 422 (invalid number / images, no consent), 413 (an image over 20 MB).
export const submitVerification = async ({ docType, docNumber, selfie, docImage }) => {
  const form = new FormData();
  form.append('doc_type', docType);
  form.append('doc_number', docNumber);
  form.append('consent', 'true');
  form.append('selfie', { uri: selfie.uri, type: selfie.type || 'image/jpeg', name: selfie.fileName || 'selfie.jpg' });
  form.append('doc_image', {
    uri: docImage.uri,
    type: docImage.type || 'image/jpeg',
    name: docImage.fileName || 'document.jpg',
  });
  const data = await request(ENDPOINTS.VERIFICATION, { method: 'POST', body: form, timeoutMs: UPLOAD_TIMEOUT_MS });
  return mapVerification(data.verification);
};
