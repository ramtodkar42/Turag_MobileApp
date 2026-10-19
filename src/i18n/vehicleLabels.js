import en from './locales/en';

// Fixed vehicle labels (fuel, vehicle type, inspection, …) in the current language.
// Real API vehicles carry keys / raw codes (see api/mappers/listing.js); mock and
// saved data carry English text, which is matched back to its key when known.
// Anything without a known key is shown as it is.

const hasKey = key => !!key && en[key] != null;

const toCode = value => String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');

// English text -> its key under prefix ('TURAG Verified' -> 'marketplace.inspection.TURAG_VERIFIED').
const keyForText = (prefix, text) =>
  text ? Object.keys(en).find(key => key.startsWith(`${prefix}.`) && en[key] === text) : null;

// t(key) when the key exists, else the text as is.
export const keyLabel = (t, key, text, prefix) => {
  const found = hasKey(key) ? key : prefix && keyForText(prefix, text);
  return found ? t(found) : text;
};

// Free backend values with a few known codes: codeLabel(t, 'marketplace.fuel', 'DIESEL', 'Diesel').
export const codeLabel = (t, prefix, code, text) => {
  const raw = code ?? text;
  const key = raw ? `${prefix}.${toCode(raw)}` : null;
  return hasKey(key) ? t(key) : text;
};
