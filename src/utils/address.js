// Address helpers for a booking's address: { line1, area, city, pincode }
// `city` is the backend's code ('PUNE' | 'PCMC').
import { tNow } from '../i18n';

// 'PUNE' -> "Pune", 'PCMC' -> "Pimpri-Chinchwad" (in the app language).
export const cityLabel = city => {
  if (!city) {
    return '';
  }
  const key = `common.city.${city}`;
  const text = tNow(key);
  return text === key ? city : text;
};

// "Flat 1009, Sahyadri residency, Baner, Pune, 411015"
export const addressLine = ({ line1, area, city, pincode }) =>
  [line1, area, cityLabel(city), pincode].filter(Boolean).join(', ');
