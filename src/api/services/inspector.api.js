// Inspector API (role 'inspector'), as the web's /inspector pages:
// the job queue (doorstep bookings assigned to me - assigned automatically,
// there is no accept / decline), starting the M2 inspection for a booking
// (RC lookup -> confirm -> create, which moves the booking to ON_SITE), the
// checklist + saved answers + photos to capture, answers, uploads, submit.
// Real backend when USE_REAL_API.inspector is true (src/api/config.js), mock otherwise.
import { ApiError, request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import {
  mapCapturedShots,
  mapChecklist,
  mapInspection,
  mapJob,
  mapShotMedia,
} from '../mappers/inspection';
import { sampleChecklist, sampleInspection, sampleQueue } from '../mock/inspector';
import {
  confirmVehicle,
  deleteInspectionFile,
  recordInspectionAnswer,
  startSelfInspection,
  submitInspection,
  uploadInspectionFile,
} from './valuation.api';
import { tNow } from '../../i18n';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.inspector;

// MOCK state (raw backend shapes), created on first use.
let mock = null;
const mockState = () => {
  mock ??= {
    queue: sampleQueue(),
    inspections: { insp_mock_m2: sampleInspection() },
    media: { insp_mock_m2: [] },
  };
  return mock;
};

// MOCK: an inspection that isn't in the sample data is the customer's own
// self-inspection (M1), created on its first answer / upload.
const mockInspection = inspectionId => {
  const state = mockState();
  state.inspections[inspectionId] ??= { ...sampleInspection(), id: inspectionId, mode: 'M1', items: [] };
  state.media[inspectionId] ??= [];
  return state.inspections[inspectionId];
};

const notFound = () =>
  new ApiError({ status: 404, code: 'BOOKING_NOT_FOUND', message: tNow('inspector.job.notFound') });

// --- Jobs -------------------------------------------------------------------------

// My jobs: to do first (by slot time), then the rest. 403 FORBIDDEN = not an inspector.
export const getInspectorJobs = async () => {
  let jobs;
  if (!real()) {
    await wait(500);
    jobs = mockState().queue.map(mapJob);
  } else {
    const data = await request(ENDPOINTS.BOOKING_QUEUE);
    jobs = (data.bookings ?? []).map(mapJob);
  }
  return jobs.sort((a, b) => Number(b.toDo) - Number(a.toDo) || (a.slotAt ?? 0) - (b.slotAt ?? 0));
};

// One job. No single-booking endpoint (the web does the same): from the queue.
export const getInspectorJob = async bookingId => {
  const job = (await getInspectorJobs()).find(j => j.id === bookingId);
  if (!job) {
    throw notFound();
  }
  return job;
};

// Starts the M2 inspection for a job, for the vehicle confirmed from its RC
// (registrationNumber: the plate the inspector checked). Links the booking
// (-> ON_SITE). Returns { inspectionId }.
// Errors: 422 CHECKLIST_NOT_FOUND (no checklist for the vehicle type yet),
//         403 FORBIDDEN (not your job), 409 INVALID_STATE_TRANSITION.
export const startJobInspection = async ({ job, registrationNumber }) => {
  const vehicle = await confirmVehicle(registrationNumber);
  if (!real()) {
    await wait(600);
    const state = mockState();
    const raw = state.queue.find(b => b.booking_id === job.id);
    const id = `insp_mock_${job.id}`;
    state.inspections[id] = {
      ...sampleInspection(),
      id,
      items: [],
      vehicle: { make: vehicle.make, model: vehicle.model, mfg_year: vehicle.year, category: job.category },
    };
    state.media[id] = [];
    raw.inspection_id = id;
    raw.status = 'ON_SITE';
    return { inspectionId: id };
  }
  const data = await request(ENDPOINTS.INSPECTIONS, {
    method: 'POST',
    body: { vehicle_id: vehicle.vehicleId, mode: 'M2', category: job.category, booking_id: job.id },
  });
  return { inspectionId: data.inspection.id };
};

// The customer's own self-inspection (M1, as the web's "Inspect it yourself"):
// created for the confirmed vehicle, then filled in with the same capture
// wizard. Returns { inspectionId }.
export const beginSelfInspection = async ({ vehicleId, category }) => {
  const result = await startSelfInspection({ vehicleId, category });
  if (!real()) {
    mockInspection(result.inspectionId);
  }
  return result;
};

// --- Capture ----------------------------------------------------------------------

// Everything the capture screens need: { inspection, items (checklist for its
// mode), shots ({ [itemCode]: [shotCode] } already uploaded), shotMedia
// ({ 'itemCode|shotCode': [mediaId] }, what a retake replaces) }.
export const getCaptureData = async inspectionId => {
  if (!real()) {
    await wait(600);
    const state = mockState();
    const raw = state.inspections[inspectionId];
    if (!raw) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: tNow('inspector.capture.notFound') });
    }
    const inspection = mapInspection(raw);
    return {
      inspection,
      items: mapChecklist(sampleChecklist(), inspection.mode),
      shots: mapCapturedShots(state.media[inspectionId]),
      shotMedia: mapShotMedia(state.media[inspectionId]),
    };
  }
  const data = await request(ENDPOINTS.inspection(inspectionId));
  const inspection = mapInspection(data.inspection);
  const [checklist, media] = await Promise.all([
    request(ENDPOINTS.checklist(inspection.category, inspection.checklistVersion)),
    request(ENDPOINTS.inspectionMedia(inspectionId)),
  ]);
  return {
    inspection,
    items: mapChecklist(checklist.checklist, inspection.mode),
    shots: mapCapturedShots(media.items),
    shotMedia: mapShotMedia(media.items),
  };
};

// Saves one answer. answer: { severity, numericValue?, note?, naReason?, refurbCost? }
// Also used by the customer's self-inspection (same backend call).
export const saveInspectorAnswer = async (inspectionId, itemCode, answer) => {
  if (!real()) {
    const raw = mockInspection(inspectionId);
    raw.items = [
      ...raw.items.filter(i => i.item_code !== itemCode),
      {
        item_code: itemCode,
        severity: answer.severity,
        numeric_value: answer.numericValue ?? null,
        text_note: answer.note ?? null,
        na_reason: answer.naReason ?? null,
        refurb_cost_minor: answer.refurbCost != null ? answer.refurbCost * 100 : null,
      },
    ];
  }
  await recordInspectionAnswer({ inspectionId, itemCode, ...answer });
};

// Uploads one photo / document for an item's shot.
export const uploadInspectorFile = async ({ inspectionId, itemCode, shotCode, kind, file }) => {
  const result = await uploadInspectionFile({ inspectionId, itemCode, shotCode, kind, file });
  if (!real()) {
    mockInspection(inspectionId);
    mockState().media[inspectionId].push({
      id: result.mediaId,
      item_code: itemCode,
      shot_code: shotCode,
      status: 'PROCESSED',
    });
  }
  return result;
};

// Deletes one uploaded file (the old one after a retake).
export const deleteInspectorFile = async (inspectionId, mediaId) => {
  await deleteInspectionFile(mediaId);
  if (!real()) {
    const media = mockState().media;
    media[inspectionId] = (media[inspectionId] ?? []).filter(m => m.id !== mediaId);
  }
};

// Submits for Turag's QC. Returns { status } - 'PENDING_QC', or
// 'INTEGRITY_FAILED' (some photos failed checks: resume, retake, submit again).
// Errors: 422 EVIDENCE_REQUIRED / SHOT_MISSING (message names what's missing).
export const submitForQc = async inspectionId => {
  const result = await submitInspection(inspectionId);
  if (!real()) {
    mockInspection(inspectionId).status = 'PENDING_QC';
  }
  return result;
};

// INTEGRITY_FAILED -> IN_PROGRESS, to retake the flagged photos.
// `self`: the customer's self-inspection uses /reopen, as the web's /inspect
// page does (only legal from INTEGRITY_FAILED); the inspector uses /resume.
export const resumeInspection = async (inspectionId, { self = false } = {}) => {
  if (!real()) {
    await wait(400);
    mockInspection(inspectionId).status = 'IN_PROGRESS';
    return;
  }
  const path = self ? ENDPOINTS.inspectionReopen(inspectionId) : ENDPOINTS.inspectionResume(inspectionId);
  await request(path, { method: 'POST' });
};

// Tests only.
export const resetMockInspector = () => {
  mock = null;
};
