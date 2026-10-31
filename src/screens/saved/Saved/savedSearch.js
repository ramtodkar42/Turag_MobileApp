// The Saved tab's search: a quick filter over the user's own saved vehicles
// (on the phone - Home's search is the one that searches the marketplace).
// Every typed word must appear somewhere on the vehicle: name, variant, year,
// fuel, gearbox, body, colour or place ("swift diesel pune", "2019"). A price
// ("5 lakh", "under 5.5 lakh", "5L") keeps vehicles at or below it.

const LAKH = 100000;
// Words that only lead into a price ("under 5 lakh").
const PRICE_WORDS = new Set(['under', 'below', 'upto', 'within', 'max', 'less', 'than', 'rs', '₹']);
const LAKH_WORDS = new Set(['l', 'lac', 'lacs', 'lakh', 'lakhs']);

const textOf = vehicle =>
  [
    vehicle.name,
    vehicle.variant,
    vehicle.year,
    vehicle.fuel,
    vehicle.transmission,
    vehicle.bodyType,
    vehicle.color,
    vehicle.city,
    vehicle.locality,
    vehicle.state,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

// "under 5 lakh swift" -> { words: ['swift'], maxPrice: 500000 }
export const parseSavedQuery = query => {
  const tokens = String(query ?? '')
    .toLowerCase()
    .replace(/,/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const words = [];
  let maxPrice = null;
  tokens.forEach((token, i) => {
    const joined = token.match(/^(\d+(?:\.\d+)?)(l|lac|lacs|lakh|lakhs)$/); // "5l", "5lakh"
    if (joined) {
      maxPrice = Number(joined[1]) * LAKH;
    } else if (/^\d+(\.\d+)?$/.test(token) && LAKH_WORDS.has(tokens[i + 1])) {
      maxPrice = Number(token) * LAKH; // "5 lakh"
    } else if (LAKH_WORDS.has(token) && /^\d+(\.\d+)?$/.test(tokens[i - 1] ?? '')) {
      // the "lakh" of "5 lakh"
    } else {
      words.push(token);
    }
  });
  return {
    words: maxPrice != null ? words.filter(w => !PRICE_WORDS.has(w)) : words,
    maxPrice,
  };
};

// The saved vehicles matching the typed text (all of them when it's empty).
export const filterSaved = (vehicles, query) => {
  const { words, maxPrice } = parseSavedQuery(query);
  if (words.length === 0 && maxPrice == null) return vehicles;
  return vehicles.filter(vehicle => {
    if (maxPrice != null && !(vehicle.price != null && vehicle.price <= maxPrice)) return false;
    const text = textOf(vehicle);
    return words.every(word => text.includes(word));
  });
};
