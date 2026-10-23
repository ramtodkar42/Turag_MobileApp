// Inspector API (role 'inspector'), as the web's /inspector pages:
// the job queue (doorstep bookings assigned to me - assigned automatically,
// there is no accept / decline), starting the M2 inspection for a booking
// (RC lookup -> confirm -> create, or make / model -> identify -> create;
// creating moves the booking to ON_SITE). The capture itself is the shared
// inspection screen (screens/selfInspection) and its API.
// Real backend when USE_REAL_API.inspector is true (src/api/config.js), mock otherwise.
import { ApiError, request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapJob } from '../mappers/inspection';
import { mapVehicle } from '../mappers/valuation';
import { sampleInspection, sampleQueue } from '../mock/inspector';
import { confirmVehicle, proposeVehicle, startSelfInspection } from './valuation.api';
import { normalizeRegNumber } from '../../utils/validators';
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

// RC lookup on site, for the "Is this the vehicle?" card (saves nothing): the
// registry vehicle plus fromCache (a verified registry record vs a live lookup,
// as the web's card). 404 NOT_FOUND = no match: identify it manually instead.
export const proposeJobVehicle = async registrationNumber => {
  if (!USE_REAL_API.valuation) {
    return { ...(await proposeVehicle(registrationNumber)), fromCache: false };
  }
  const plate = normalizeRegNumber(registrationNumber);
  try {
    const data = await request(ENDPOINTS.VEHICLE_PROPOSE, {
      method: 'POST',
      body: { registration_number: plate },
    });
    return { ...mapVehicle(data, { registrationNumber: plate }), fromCache: !!data.from_cache };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: tNow('inspector.start.notMatched') });
    }
    if (e instanceof ApiError && e.status === 422) {
      throw new ApiError({ status: 422, code: 'INVALID_PLATE', message: tNow('valuation.evaluate.invalidPlate') });
    }
    throw e;
  }
};

// Creates the job's M2 inspection for a saved vehicle and links the booking
// (-> ON_SITE). Shared by the RC and the manual path, as the web.
// 409 BOOKING_EXPIRED (the slot lapsed past the start grace) gets the
// "ops must reschedule" message.
const createJobInspection = async (job, vehicle) => {
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
    if (raw) {
      raw.inspection_id = id;
      raw.status = 'ON_SITE';
    }
    return { inspectionId: id };
  }
  try {
    const data = await request(ENDPOINTS.INSPECTIONS, {
      method: 'POST',
      body: { vehicle_id: vehicle.vehicleId, mode: 'M2', category: job.category, booking_id: job.id },
    });
    return { inspectionId: data.inspection.id };
  } catch (e) {
    if (e instanceof ApiError && e.code === 'BOOKING_EXPIRED') {
      throw new ApiError({ status: e.status, code: e.code, message: tNow('inspector.start.expired') });
    }
    throw e;
  }
};

// Starts the M2 inspection for a job, for the vehicle confirmed from its RC
// (registrationNumber: the plate the inspector checked). Returns { inspectionId }.
// Errors: 422 CHECKLIST_NOT_FOUND (no checklist for the vehicle type yet),
//         403 FORBIDDEN (not your job), 409 INVALID_STATE_TRANSITION / BOOKING_EXPIRED.
export const startJobInspection = async ({ job, registrationNumber }) => {
  const vehicle = await confirmVehicle(registrationNumber);
  return createJobInspection(job, vehicle);
};

// "Or identify manually" (when the RC lookup has no match, or isn't in the
// catalogue): POST /vehicles/identify by make + model (+ year, fuel - fuel is
// needed when the model isn't in the catalogue), with the job's category,
// then the same inspection as the RC path. Returns { inspectionId }.
export const startManualInspection = async ({ job, make, model, year, fuel }) => {
  const yearNum = Number(year);
  const body = {
    make: make.trim(),
    model: model.trim(),
    ...(fuel ? { fuel } : {}),
    ...(Number.isInteger(yearNum) && yearNum > 1980 ? { year: yearNum } : {}),
    category: job.category,
  };
  let vehicle;
  if (!real()) {
    await wait(500);
    vehicle = { vehicleId: `veh_mock_${job.id}`, make: body.make, model: body.model, year: body.year ?? null };
  } else {
    const data = await request(ENDPOINTS.VEHICLE_IDENTIFY, { method: 'POST', body, idempotent: true });
    vehicle = { vehicleId: data.vehicle_id, make: data.make, model: data.model, year: data.mfg_year };
  }
  return createJobInspection(job, vehicle);
};

// The customer's own self-inspection (M1, as the web's "Inspect it yourself"):
// created for the confirmed vehicle, then filled in with the same capture
// wizard. consent: the ticked inspection-consent box. Returns { inspectionId }.
export const beginSelfInspection = async ({ vehicleId, category, consent }) => {
  const result = await startSelfInspection({ vehicleId, category, consent });
  if (!real()) {
    mockInspection(result.inspectionId);
  }
  return result;
};

// Tests only.
export const resetMockInspector = () => {
  mock = null;
};
