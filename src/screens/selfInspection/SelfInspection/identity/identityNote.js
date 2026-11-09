// The A1 / P1 note saved after a confirmed VIN / RC read. Same fixed formats as
// the web (not translated), so stored answers don't depend on the app language:
// a self-inspection saves the values (formatVinNote / formatRcNote) and an inspector's
// inspection saves a masked line.

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

// A self-inspection's notes. QC's identity check reads the VIN, chassis and registration
// from them on the server, so these exact formats matter: "VIN x | Engine y" and
// "RC: Reg x | Chassis y | Engine z | make model variant | fuel | MFG n | Reg dt d".
export const formatVinNote = (vin, engineNumber) => {
  const engine = engineNumber?.trim();
  return engine ? `VIN ${vin.trim()} | Engine ${engine}` : `VIN ${vin.trim()}`;
};

export const formatRcNote = fields => {
  const f = key => String(fields[key] ?? '').trim();
  const name = [f('make'), f('model'), f('variant')].filter(Boolean).join(' ');
  const parts = [
    f('registrationNumber') && `Reg ${f('registrationNumber')}`,
    f('chassisNumber') && `Chassis ${f('chassisNumber')}`,
    f('engineNumber') && `Engine ${f('engineNumber')}`,
    name,
    f('fuel'),
    f('mfgYear') && `MFG ${f('mfgYear')}`,
    f('regDate') && `Reg dt ${f('regDate')}`,
  ].filter(Boolean);
  return parts.length ? `RC: ${parts.join(' | ')}` : 'RC: confirmed from photo';
};

// An inspector's inspection: a MASKED line only, word for word the web's
// (formatMaskedIdentityNote / formatMaskedRcNote). The ID numbers (VIN / chassis /
// engine / registration) and the owner name are NEVER written - the plaintext
// reads live only in the identity-verify request body. The RC line keeps the
// web's " | " parts, which QC's document check reads (make & model, fuel, MFG year).
// Fixed English (not translated), so stored answers don't depend on language.
export const formatMaskedVinNote = hasEngine =>
  hasEngine
    ? 'VIN + engine read confirmed from plate photo (values withheld — verified against RC baseline)'
    : 'VIN read confirmed from plate photo (value withheld — verified against RC baseline)';

export const formatMaskedRcNote = fields => {
  const f = key => String(fields[key] ?? '').trim();
  const name = [f('make'), f('model'), f('variant')].filter(Boolean).join(' ');
  const parts = [];
  if (name) parts.push(name);
  if (f('fuel')) parts.push(f('fuel'));
  if (f('mfgYear')) parts.push(`MFG ${f('mfgYear')}`);
  if (f('regDate')) parts.push(`Reg dt ${f('regDate')}`);
  parts.push('VIN/engine/reg values withheld — verified against RC baseline');
  return `RC: ${parts.join(' | ')}`;
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
