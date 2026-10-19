// Backend money is { amount_minor (paise), currency: 'INR' }; screens use rupees.

// Money (or paise number) -> rupees, or null when missing.
export const toRupees = money => {
  const minor = typeof money === 'number' ? money : money?.amount_minor;
  return minor != null ? Math.round(minor / 100) : null;
};

// Rupees -> Money for request bodies.
export const toMoney = rupees => ({ amount_minor: Math.round(Number(rupees) * 100), currency: 'INR' });

// ISO string -> ms (null when missing / invalid).
export const toTime = iso => {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(time) ? time : null;
};
