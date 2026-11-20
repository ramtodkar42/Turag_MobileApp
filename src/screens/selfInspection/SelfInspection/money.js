// MONEY answers (ADR-0107, e.g. the loan amount remaining): the owner types
// whole rupees; the server stores integer paise (value_money_minor).

// The server's typo guard: at most ₹10 crore.
export const MONEY_MAX_RUPEES = 100000000;
// Enough digits for that (and no more).
export const MONEY_MAX_DIGITS = 9;

// Only the digits of what was typed (₹, commas and spaces dropped), no leading zeros.
export const moneyDigits = text => String(text ?? '').replace(/\D/g, '').replace(/^0+/, '').slice(0, MONEY_MAX_DIGITS);

// Typed rupees -> paise, or null when it isn't a whole amount above zero and
// within the limit (as the web's rupeesToPaise, plus the server's limit).
export const rupeesToPaise = text => {
  const cleaned = String(text ?? '').replace(/[₹,\s]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const rupees = Number(cleaned);
  if (rupees <= 0 || rupees > MONEY_MAX_RUPEES) return null;
  return rupees * 100;
};

// Stored paise -> the rupees the field shows ('' when there's none).
export const paiseToRupeesText = minor => (minor != null && minor > 0 ? String(Math.round(minor / 100)) : '');
