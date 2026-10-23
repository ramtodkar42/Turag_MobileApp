// Identity verification (as the web's VerificationForm / verification-client,
// ADR-0041): the customer adds a government ID (Aadhaar, PAN or Driving
// Licence) - its number, a photo of it and a selfie. Turag's team reviews it
// later; it never holds up a booking. The number is encrypted on the server and
// only ever comes back masked ("XXXX XXXX 1234").
import { request } from '../client';
import { UPLOAD_TIMEOUT_MS } from '../config';
import { ENDPOINTS } from '../endpoints';

// Backend verification -> { id, status ('PENDING_REVIEW' | 'APPROVED' | 'REJECTED'),
//   docType, docMasked, rejectionReason, submittedAt }
const mapVerification = v => ({
  id: v.verification_id,
  status: v.status,
  docType: v.doc_type,
  docMasked: v.doc_masked ?? '',
  rejectionReason: v.rejection_reason ?? null,
  submittedAt: v.submitted_at ?? null,
});

// The signed-in user's verification, or null if they never submitted one.
export const getMyVerification = async () => {
  const data = await request(ENDPOINTS.VERIFICATION);
  return data?.verification ? mapVerification(data.verification) : null;
};

// As the web's booking: the ID step is shown unless the user is already
// verified or has one waiting for review (never asked to send it twice). If the
// status can't be read, it's shown (the web's safe default).
export const needsVerification = verification =>
  !(verification && (verification.status === 'APPROVED' || verification.status === 'PENDING_REVIEW'));

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
