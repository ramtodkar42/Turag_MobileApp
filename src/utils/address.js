// Address helpers for a booking's address: { address, building, landmark, city, pincode }
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

// "Flat 402, Sunshine Society, Baner Road, Baner, Pune, 411045"
export const addressLine = ({ building, address, city, pincode }) =>
  [building, address, cityLabel(city), pincode].filter(Boolean).join(', ');
