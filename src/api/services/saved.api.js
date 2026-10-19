// Saved (hearted) vehicles API - needs sign-in.
// Real backend when USE_REAL_API.marketplace is true (src/api/config.js), mock otherwise.
import { ApiError, request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapListingSummary } from '../mappers/listing';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.marketplace;

// MOCK storage (newest first), used when the real API is off.
let mockSaved = [];

// The user's saved vehicles, newest first. Listings that have left the
// marketplace (no summary any more) are skipped.
export const getSavedVehicles = async () => {
  if (!real()) {
    await wait(200);
    return mockSaved;
  }
  const data = await request(ENDPOINTS.SAVED_LISTINGS);
  return (data.items ?? [])
    .filter(item => item.summary)
    .map(item => mapListingSummary(item.summary));
};

export const saveVehicle = async vehicle => {
  if (!real()) {
    await wait(200);
    mockSaved = [vehicle, ...mockSaved.filter(v => v.id !== vehicle.id)];
    return;
  }
  try {
    await request(ENDPOINTS.SAVED_LISTINGS, { method: 'POST', body: { listing_id: vehicle.id } });
  } catch (e) {
    // Already saved (e.g. from another device) is fine.
    if (!(e instanceof ApiError && e.status === 409)) {
      throw e;
    }
  }
};

export const removeSavedVehicle = async vehicleId => {
  if (!real()) {
    await wait(200);
    mockSaved = mockSaved.filter(v => v.id !== vehicleId);
    return;
  }
  try {
    await request(ENDPOINTS.savedListing(vehicleId), { method: 'DELETE' });
  } catch (e) {
    // Not saved any more is fine.
    if (!(e instanceof ApiError && e.status === 404)) {
      throw e;
    }
  }
};

// Tests only.
export const resetMockSaved = () => {
  mockSaved = [];
};
