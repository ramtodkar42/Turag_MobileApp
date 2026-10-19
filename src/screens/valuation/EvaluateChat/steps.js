// What the user answers next in the Evaluate chat (the footer shows the
// matching input or choices).
export const STEPS = {
  REG: 'reg', // type the registration number
  CONFIRM: 'confirm', // Not my vehicle / Yes, it's mine
  KM: 'km', // type the km driven
  OWNERS: 'owners', // tap or type the number of owners
  ACCIDENT: 'accident', // No / Minor / Major accident
  RESULT: 'result', // Save Vehicle / Inspect Vehicle
  MODE: 'mode', // Self Inspection / Appoint an Inspector
  SELF: 'self', // Start self-inspection
};

// Backend limits for the declared estimate.
export const MAX_KM = 1000000;
export const MAX_OWNERS = 20;
export const OWNER_CHOICES = [1, 2, 3, 4];
