// The IDs accepted for identity verification - the web's VerificationForm DOCS,
// with the same number rules (only a quick check here; the server decides).
// Labels / hints are i18n keys: verify.doc.<type>, verify.hint.<type>.

// "1234 5678 9012" -> "123456789012" (spaces / dashes dropped, upper case).
export const compact = text => String(text ?? '').replace(/[\s-]/g, '').toUpperCase();

export const DOCUMENTS = [
  {
    type: 'AADHAAR',
    placeholder: 'XXXX XXXX XXXX',
    keyboardType: 'number-pad',
    autoCapitalize: 'none',
    valid: c => /^[2-9][0-9]{11}$/.test(c),
    // Groups of 4 as it's typed: "1234 5678 9012".
    format: raw =>
      raw
        .replace(/\D/g, '')
        .slice(0, 12)
        .replace(/(.{4})(.{0,4})(.{0,4})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' ')),
  },
  {
    type: 'PAN',
    placeholder: 'ABCDE1234F',
    keyboardType: 'default',
    autoCapitalize: 'characters',
    valid: c => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(c),
    format: raw => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
  },
  {
    type: 'DRIVING_LICENCE',
    placeholder: 'MH12 20110012345',
    keyboardType: 'default',
    autoCapitalize: 'characters',
    valid: c => /^[A-Z0-9]{8,20}$/.test(c),
    format: raw => raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 24),
  },
];

export const documentOf = type => DOCUMENTS.find(d => d.type === type) ?? DOCUMENTS[0];
