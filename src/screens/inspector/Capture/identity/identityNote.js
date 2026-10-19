// The A1 / P1 note saved after a confirmed VIN / RC read. Same fixed format as
// the web (not translated), so stored answers don't depend on the app language.

// RC fields kept from a read: vehicle identity only - owner details are never
// shown or saved.
export const RC_FIELDS = [
  ['registrationNumber', 'inspector.identity.registration'],
  ['chassisNumber', 'inspector.identity.vin'],
  ['engineNumber', 'inspector.identity.engine'],
  ['make', 'inspector.identity.make'],
  ['model', 'inspector.identity.model'],
  ['variant', 'inspector.identity.variant'],
  ['fuel', 'inspector.identity.fuel'],
  ['mfgYear', 'inspector.identity.year'],
  ['regDate', 'inspector.identity.regDate'],
];

export const emptyRc = () => Object.fromEntries(RC_FIELDS.map(([key]) => [key, '']));

export const rcFromRead = read =>
  Object.fromEntries(
    RC_FIELDS.map(([key]) => [key, read?.[key] == null ? '' : String(read[key]).trim()]),
  );

export const hasRcDetails = fields => RC_FIELDS.some(([key]) => String(fields[key] ?? '').trim());

// What gets SAVED as the item note: a MASKED line only (as the web). The ID
// numbers (VIN / chassis / engine / registration) and the owner name are NEVER
// written - the plaintext reads live only in the identity-verify request body.
// Fixed English (not translated), so stored answers don't depend on language.
export const formatMaskedVinNote = hasEngine =>
  hasEngine
    ? 'VIN read confirmed from plate photo; engine no. confirmed (values withheld)'
    : 'VIN read confirmed from plate photo (value withheld)';

export const formatMaskedRcNote = fields => {
  const f = key => String(fields[key] ?? '').trim();
  const name = [f('make'), f('model'), f('variant')].filter(Boolean).join(' ');
  const parts = [];
  if (name) parts.push(name);
  if (f('fuel')) parts.push(f('fuel'));
  if (f('mfgYear')) parts.push(`MFG ${f('mfgYear')}`);
  return parts.length
    ? `RC: ${parts.join(' · ')} (ID numbers withheld)`
    : 'RC: confirmed from photo (details withheld)';
};

// The CONFIRMED plaintext reads sent to identity-verify for baseline matching
// (never persisted). Registration from the RC is checked against the RC hash.
export const vinEvidence = (vin, engineNumber) => ({
  vin: vin?.trim() || null,
  engineNumber: engineNumber?.trim() || null,
});

export const rcEvidence = fields => {
  const f = key => String(fields[key] ?? '').trim();
  const year = parseInt(f('mfgYear'), 10);
  return {
    vin: f('chassisNumber') || null,
    engineNumber: f('engineNumber') || null,
    frontPlate: f('registrationNumber') || null,
    make: f('make') || null,
    model: f('model') || null,
    variant: f('variant') || null,
    mfgYear: Number.isFinite(year) ? year : null,
    fuel: f('fuel') || null,
  };
};
