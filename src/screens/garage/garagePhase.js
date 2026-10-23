// What a garage vehicle shows and offers at each stage - the web's Garage card
// (mappers/valuation garagePhase): the status chip, a line of help, and the
// next step. Shared by the Garage card and the vehicle page.

// The stage (older cached vehicles may not carry one yet).
export const phaseOf = vehicle =>
  vehicle.phase ?? (vehicle.listingId ? 'listed' : vehicle.inspectionEligible ? 'can_list' : 'fresh');

// In review: what's happening with the inspection.
const reviewKey = status => {
  if (status === 'PENDING_QC') return 'underReview';
  if (status === 'QC_REJECTED') return 'needsAttention';
  if (status === 'SUBMITTED') return 'submitted';
  return 'inProgress';
};

// Status chip: { labelKey, tone ('success' | 'warning' | 'neutral') }.
export const phaseBadge = vehicle => {
  switch (phaseOf(vehicle)) {
    case 'listed':
      return { labelKey: 'garage.phase.listed', tone: 'success' };
    case 'can_list':
      return { labelKey: 'garage.phase.canList', tone: 'success' };
    case 'resume_self':
      return { labelKey: 'garage.phase.resumeSelf', tone: 'warning' };
    case 'in_review':
      return { labelKey: `garage.phase.${reviewKey(vehicle.inspectionStatus)}`, tone: 'warning' };
    default:
      return { labelKey: 'garage.status.not_inspected', tone: 'neutral' };
  }
};

// One line of help under the chip (null when the action says it all).
export const phaseHintKey = vehicle => {
  switch (phaseOf(vehicle)) {
    case 'fresh':
      return 'garage.hint.fresh';
    case 'resume_self':
      return 'garage.hint.resume';
    case 'in_review': {
      const status = vehicle.inspectionStatus;
      if (status === 'PENDING_QC') return 'garage.hint.pendingQc';
      if (status === 'QC_REJECTED') return 'garage.hint.qcRejected';
      return 'garage.hint.preparing';
    }
    default:
      return null;
  }
};

// The main next step:
//   'view'    - open its listing
//   'list'    - create a listing (inspected, valued)
//   'book'    - book an inspector (no value yet, or the inspection was rejected)
//   'resume'  - continue the self-inspection
//   'summary' - the submitted self-inspection's summary
//   'inspect' - not inspected yet: self-inspect or book an inspector
//   null      - with Turag, nothing to do but wait
export const phaseAction = vehicle => {
  switch (phaseOf(vehicle)) {
    case 'listed':
      return 'view';
    case 'can_list':
      return vehicle.valuationId ? 'list' : 'book';
    case 'resume_self':
      return 'resume';
    case 'in_review':
      if (vehicle.inspectionStatus === 'QC_REJECTED') return 'book';
      return vehicle.inspectionMode === 'M1' ? 'summary' : null;
    default:
      return 'inspect';
  }
};
