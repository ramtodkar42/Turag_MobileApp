// Become a dealer (ADR-0101, as the web's /dealer/apply): a signed-in user
// sends their business details and KYC documents (PAN, Aadhaar, and the Shop
// Act licence or Udyam certificate). Turag's team verifies them; once it's
// approved ("onboarded") the account becomes a dealer on the next sign-in.
// Real backend when USE_REAL_API.auth is true (src/api/config.js), mock otherwise.
import { ApiError, request } from '../client';
import { UPLOAD_TIMEOUT_MS, USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';

const real = () => USE_REAL_API.auth;

// The server's cap on one document (JPG, PNG or PDF).
export const DEALER_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

// DRAFT -> PENDING_REVIEW -> (CHANGES_NEEDED -> PENDING_REVIEW) -> VERIFIED ->
// ONBOARDED, or REJECTED. The applicant can edit only a DRAFT or CHANGES_NEEDED one.
export const EDITABLE_STATUSES = new Set(['DRAFT', 'CHANGES_NEEDED']);

// The documents needed: PAN, Aadhaar, and the chosen business registration.
export const requiredDocuments = registrationType => ['PAN', 'AADHAAR', registrationType || 'SHOP_ACT'];

const mapDocument = d => ({
  id: d.id,
  docType: d.doc_type,
  contentType: d.content_type,
  // 'VERIFIED' | 'REJECTED' | null (uploaded, waiting for review)
  decision: d.decision ?? null,
  decisionReason: d.decision_reason ?? null,
  uploadedAt: d.uploaded_at ? Date.parse(d.uploaded_at) : null,
});

// The server's DealerApplicationDto -> the app's shape (null: not started).
export const mapDealerApplication = a =>
  a
    ? {
        id: a.id,
        status: a.status,
        version: a.version,
        statusReason: a.status_reason ?? null,
        businessName: a.business_name ?? '',
        ownerName: a.owner_name ?? '',
        email: a.email ?? '',
        addressLine: a.address_line ?? '',
        city: a.city ?? '',
        state: a.state ?? '',
        pinCode: a.pin_code ?? '',
        pan: a.pan ?? '',
        gstin: a.gstin ?? '',
        registrationType: a.registration_type ?? null,
        registrationNumber: a.registration_number ?? '',
        // Only the last 4 digits come back ("XXXX XXXX 1234").
        aadhaarMasked: a.aadhaar_masked ?? null,
        orgId: a.org_id ?? null,
        submittedAt: a.submitted_at ? Date.parse(a.submitted_at) : null,
        documents: (a.documents ?? []).map(mapDocument),
        editable: a.editable ?? EDITABLE_STATUSES.has(a.status),
      }
    : null;

// --- Mock (USE_REAL_API.auth off) ----------------------------------------------

let mock = null;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const mockView = () => (mock ? { ...mock, editable: EDITABLE_STATUSES.has(mock.status) } : null);

// Tests only.
export const resetMockDealerApplication = () => {
  mock = null;
};

// --- Calls ---------------------------------------------------------------------

// The user's own application, or null when they haven't started one.
export const getMyDealerApplication = async () => {
  if (!real()) {
    await wait(300);
    return mapDealerApplication(mockView());
  }
  const data = await request(ENDPOINTS.MY_DEALER_APPLICATION);
  return mapDealerApplication(data?.application);
};

// Saves (or updates) the business details - starts the application the first
// time. details: { businessName, ownerName, email, addressLine, city, state,
// pinCode, pan, gstin, registrationType 'SHOP_ACT' | 'UDYAM', registrationNumber,
// aadhaarNumber } (already checked by dealerApplyForm). The Aadhaar number is
// sent every time (only its last 4 digits are kept visible).
export const saveDealerApplication = async details => {
  const body = {
    business_name: details.businessName,
    owner_name: details.ownerName,
    email: details.email,
    address_line: details.addressLine || null,
    city: details.city,
    state: details.state,
    pin_code: details.pinCode,
    pan: details.pan,
    gstin: details.gstin || null,
    registration_type: details.registrationType,
    registration_number: details.registrationNumber,
    aadhaar_number: details.aadhaarNumber,
  };
  if (!real()) {
    await wait(400);
    mock = {
      id: mock?.id ?? 'dapp_mock_1',
      status: mock?.status ?? 'DRAFT',
      version: (mock?.version ?? 0) + 1,
      status_reason: mock?.status_reason ?? null,
      ...body,
      aadhaar_masked: `XXXX XXXX ${body.aadhaar_number.replace(/\D/g, '').slice(-4)}`,
      org_id: null,
      submitted_at: mock?.submitted_at ?? null,
      documents: mock?.documents ?? [],
    };
    return mapDealerApplication(mockView());
  }
  const data = await request(ENDPOINTS.MY_DEALER_APPLICATION, { method: 'PUT', body });
  return mapDealerApplication(data.application);
};

// Uploads one KYC document (a photo or a PDF; file: { uri, type, fileName,
// fileSize }) - replacing any earlier one of that type. docType: 'PAN' |
// 'AADHAAR' | 'SHOP_ACT' | 'UDYAM'. The details must be saved first.
export const uploadDealerDocument = async (docType, file) => {
  if (file.fileSize > DEALER_DOCUMENT_MAX_BYTES) {
    throw new ApiError({ status: 413, code: 'DOCUMENT_TOO_LARGE' });
  }
  if (!real()) {
    await wait(500);
    if (!mock) throw new ApiError({ status: 404, code: 'DEALER_APPLICATION_NOT_FOUND' });
    mock = {
      ...mock,
      documents: [
        ...mock.documents.filter(d => d.doc_type !== docType),
        { id: `doc_${docType}`, doc_type: docType, content_type: file.type, decision: null, decision_reason: null, uploaded_at: new Date().toISOString() },
      ],
    };
    return mapDealerApplication(mockView());
  }
  // The raw file is the body (the server reads its type from the bytes).
  const uri = file.uri.startsWith('/') ? `file://${file.uri}` : file.uri;
  const blob = await (await fetch(uri)).blob();
  const data = await request(ENDPOINTS.myDealerApplicationDocument(docType), {
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return mapDealerApplication(data.application);
};

// Sends it for review (DRAFT / CHANGES_NEEDED -> PENDING_REVIEW). The server
// checks the details and the documents again.
export const submitDealerApplication = async () => {
  if (!real()) {
    await wait(400);
    if (!mock) throw new ApiError({ status: 404, code: 'DEALER_APPLICATION_NOT_FOUND' });
    const have = new Set(mock.documents.map(d => d.doc_type));
    if (!requiredDocuments(mock.registration_type).every(d => have.has(d))) {
      throw new ApiError({ status: 422, code: 'DEALER_APPLICATION_INVALID_ACTION', details: { reason: 'DOCUMENTS_MISSING' } });
    }
    mock = { ...mock, status: 'PENDING_REVIEW', status_reason: null, submitted_at: new Date().toISOString() };
    return mapDealerApplication(mockView());
  }
  const data = await request(ENDPOINTS.MY_DEALER_APPLICATION_SUBMIT, { method: 'POST' });
  return mapDealerApplication(data.application);
};
