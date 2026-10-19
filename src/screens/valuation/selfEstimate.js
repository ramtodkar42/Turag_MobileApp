import { estimateValuation } from '../../api/services/valuation.api';

// The final estimate for a submitted self-inspection (DECLARED stage, using
// the inspection). Returns `fallback` (the earlier estimate) when the backend
// has none yet.
// `condition` may be absent when the self-inspection was started from the
// Garage (no prior chat collecting odometer / owners / condition); the backend
// then derives those from the inspection itself via `inspectionId`.
export default async function getSelfEstimate({ vehicle, condition, inspectionId, fallback }) {
  const result = await estimateValuation({
    vehicleId: vehicle.vehicleId,
    stage: 'DECLARED',
    odometerKm: condition?.odometerKm,
    ownerCount: condition?.ownerCount,
    condition: condition?.condition,
    inspectionId,
  });
  return result.ready ? result.valuation : fallback;
}
