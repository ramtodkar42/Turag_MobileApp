import { tNow } from '../i18n';

// 831300 -> "₹8,31,300"
export const formatINR = (amount, { symbol = true } = {}) => {
  const value = Number(amount || 0).toLocaleString('en-IN');
  return symbol ? `₹${value}` : value;
};

// Short Indian price: 880000 -> "₹8.8L", 228000 -> "₹2.28L", 15000000 -> "₹1.5Cr"
export const formatPriceShort = amount => {
  const trim = value => String(Number(value.toFixed(2)));
  if (amount >= 10000000) {
    return `₹${trim(amount / 10000000)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${trim(amount / 100000)}L`;
  }
  return formatINR(amount);
};

// { min: 800000, max: 845000 } -> "₹8L to ₹8.45L"
export const formatPriceRange = ({ min, max }) =>
  `${formatPriceShort(min)} to ${formatPriceShort(max)}`;

// 12000 -> "12,000" (Indian grouping, no symbol)
export const formatNumber = value => (value === '' || value == null ? '' : formatINR(value, { symbol: false }));


// "2026-02-07" -> "07 Feb 2026"
export const formatDate = isoDate => {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) {
    return String(isoDate ?? '');
  }
  return `${String(day).padStart(2, '0')} ${tNow(`common.month.${month - 1}`)} ${year}`;
};

// "9334556653" or "+919334556653" -> "+91 93345 56653"
export const formatPhone = value => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : String(value ?? '');
};

// "2026-10-25" -> "25/10/2026"
export const formatDateNumeric = isoDate => {
  const [year, month, day] = String(isoDate).split('-');
  return year && month && day ? `${day}/${month}/${year}` : String(isoDate ?? '');
};

// 5242880 -> "5.0 MB", 307200 -> "300 KB"
export const formatFileSize = bytes => {
  const size = Number(bytes) || 0;
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
};

// A company suffix on an RC maker name ("HONDA CARS INDIA LTD").
const MAKER_SUFFIX = /\b(cars?|motors?|motor company|automobiles?|india|pvt|private|ltd|limited|co|company)\b\.?/gi;
// An all-caps word worth softening: letters only, longer than 3 (BMW, MG, KIA stay).
const SHOUTED = /\b[A-Z]{4,}\b/g;
const soften = text => text.replace(SHOUTED, w => w[0] + w.slice(1).toLowerCase());

// A vehicle's display name from RC data, for cards:
// ("HONDA CARS INDIA LTD", "CITY") -> "Honda City",
// ("MARUTI SUZUKI INDIA LTD", "SWIFT VXI") -> "Maruti Suzuki Swift VXI".
export const vehicleName = (make, model) => {
  const maker = String(make ?? '').replace(MAKER_SUFFIX, '').replace(/\s+/g, ' ').trim() || String(make ?? '').trim();
  const name = [maker, String(model ?? '').trim()].filter(Boolean).join(' ');
  return soften(name);
};

// 49 -> "00:49"
export const formatTimer = totalSeconds => {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};
