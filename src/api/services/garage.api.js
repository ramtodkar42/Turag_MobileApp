// Garage API: the user's saved (evaluated / inspected) vehicles - needs sign-in.
// Real backend when USE_REAL_API.valuation is true (src/api/config.js), mock otherwise.
import { ApiError, newIdempotencyKey, request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapSavedVehicle } from '../mappers/valuation';
import { toIsoDate } from '../../utils/date';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.valuation;

// MOCK storage, newest first.
let mockGarage = [];

// The user's garage, newest first.
export const getGarage = async () => {
  if (!real()) {
    await wait(300);
    return mockGarage;
  }
  const data = await request(ENDPOINTS.SAVED_VEHICLES);
  return (data.items ?? []).map(mapSavedVehicle);
};

// Saves an evaluated vehicle (and its valuation) to the garage.
// vehicle: from confirmVehicle; valuation: from estimateValuation (may be null).
// inspected: a self-inspection was submitted (mock only - the backend knows).
export const saveVehicleToGarage = async ({ vehicle, valuation, inspected = false }) => {
  if (!real()) {
    await wait(600);
    const saved = {
      ...vehicle,
      id: `g-${vehicle.registrationNumber ?? vehicle.vehicleId}`,
      valuationId: valuation?.valuationId ?? null,
      inspectionId: null,
      estimatedValue: valuation?.estimatedValue ?? null,
      priceBands: valuation?.priceBands ?? null,
      status: inspected ? 'in_review' : 'not_inspected',
      listed: false,
      listingId: null,
      listingStatus: null,
      savedOn: toIsoDate(new Date()),
    };
    mockGarage = [saved, ...mockGarage.filter(v => v.id !== saved.id)];
    return saved;
  }
  const data = await request(ENDPOINTS.SAVED_VEHICLES, {
    method: 'POST',
    body: {
      vehicle_id: vehicle.vehicleId,
      ...(valuation?.valuationId ? { valuation_id: valuation.valuationId } : null),
    },
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
  return mapSavedVehicle(data.saved_vehicle);
};

export const removeFromGarage = async id => {
  if (!real()) {
    await wait(300);
    mockGarage = mockGarage.filter(v => v.id !== id);
    return;
  }
  try {
    await request(ENDPOINTS.savedVehicle(id), { method: 'DELETE' });
  } catch (e) {
    // Already gone is fine.
    if (!(e instanceof ApiError && e.status === 404)) {
      throw e;
    }
  }
};

// MOCK: the vehicle's active listing changed (the backend works this out itself).
export const setMockGarageListing = (vehicleId, listingId, listingStatus) => {
  mockGarage = mockGarage.map(v =>
    v.vehicleId === vehicleId ? { ...v, listed: !!listingId, listingId, listingStatus } : v,
  );
};

// Tests only.
export const resetMockGarage = () => {
  mockGarage = [];
};
