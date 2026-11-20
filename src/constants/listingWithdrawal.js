// Why a seller or dealer withdraws a listing (ADR-0105, as the web): one of
// these is required, and OTHER also needs a note. The server owns the list
// and checks it again. In the order the sheet shows them.
export const WITHDRAWAL_REASONS = [
  'SOLD_OUTSIDE_TURAG',
  'KEEPING_VEHICLE',
  'UNHAPPY_WITH_OFFERS',
  'CHANGING_DETAILS',
  'VEHICLE_PROBLEM',
  'LOW_INTEREST',
  'PERSONAL',
  'OTHER',
];

// The server's limit on the note.
export const WITHDRAWAL_NOTE_MAX = 500;

// A stored reason in the app's language (also the system's ACCOUNT_DELETED),
// or null when none was recorded (listings withdrawn before reasons existed).
export const withdrawalReasonLabel = (t, code) => {
  if (!code) return null;
  const key = `selling.withdraw.reason.${code}`;
  const label = t(key);
  return label === key ? code : label;
};
