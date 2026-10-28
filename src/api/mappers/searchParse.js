// The server's natural-language search parse (GET /api/ai/search-parse, the
// web's parseQueryWithAi) -> marketplace filters, as the web's
// executeAiVehicleSearch builds them, plus one chip per thing it understood.
//
// Returns { filters, chips } or null when nothing was understood:
//   filters - backend parameter names, e.g. { fuel: 'DIESEL', price_max: 1000000 }
//   chips   - [{ key, kind, ...values }]: what to show (labels are made in the
//             app's language by SmartSearchChips) and, by `key`, which filters
//             removing it drops (CHIP_PARAMS).

const has = value => value !== null && value !== undefined && value !== '';
const rupees = (inr, minor) => (has(inr) ? Number(inr) : has(minor) ? Math.round(minor / 100) : null);
const list = values => (Array.isArray(values) && values.length ? values : null);

// The filters each chip stands for (removing the chip drops all of them).
export const CHIP_PARAMS = {
  vehicle: ['vehicle_type', 'category'],
  make: ['make'],
  model: ['model'],
  body: ['body_type'],
  fuel: ['fuel'],
  transmission: ['transmission'],
  color: ['color'],
  city: ['city'],
  year: ['year', 'year_min', 'year_max'],
  price: ['price_min', 'price_max', 'min_price', 'max_price'],
  seats: ['seating_capacity', 'seats_min', 'seats_max'],
  km: ['odometer_max'],
  mileage: ['mileage_min', 'mileage_max'],
  engine: ['engine_cc_min', 'engine_cc_max'],
  power: ['bhp_min', 'bhp_max'],
  drive: ['drive_type'],
  features: ['features'],
  exclude: ['exclude_fuel', 'exclude_color', 'exclude_transmission'],
};

export const mapSearchParse = parsed => {
  if (!parsed) {
    return null;
  }
  const p = parsed;
  const filters = {};
  const chips = [];
  const set = (key, value) => {
    if (has(value)) filters[key] = value;
  };

  if (p.vehicleType || p.category) {
    set('vehicle_type', p.vehicleType);
    set('category', p.category);
    chips.push({ key: 'vehicle', kind: 'vehicle', value: p.category ?? p.vehicleType });
  }
  if (p.brand) {
    set('make', p.brand);
    chips.push({ key: 'make', kind: 'text', value: p.brand });
  }
  if (p.model) {
    set('model', p.model);
    chips.push({ key: 'model', kind: 'text', value: p.model });
  }
  if (p.bodyType) {
    set('body_type', p.bodyType);
    chips.push({ key: 'body', kind: 'body', value: p.bodyType });
  }
  if (p.fuelType) {
    set('fuel', p.fuelType);
    chips.push({ key: 'fuel', kind: 'fuel', value: p.fuelType });
  }
  if (p.transmission) {
    set('transmission', p.transmission);
    chips.push({ key: 'transmission', kind: 'transmission', value: p.transmission });
  }
  if (p.color) {
    set('color', p.color);
    chips.push({ key: 'color', kind: 'text', value: p.color });
  }
  if (p.city) {
    set('city', p.city);
    chips.push({ key: 'city', kind: 'city', value: p.city });
  }

  if (has(p.year)) {
    set('year', p.year);
    chips.push({ key: 'year', kind: 'year', from: p.year, to: p.year });
  } else if (has(p.minYear) || has(p.maxYear)) {
    set('year_min', p.minYear);
    set('year_max', p.maxYear);
    chips.push({ key: 'year', kind: 'year', from: p.minYear ?? null, to: p.maxYear ?? null });
  }

  const min = rupees(p.minPrice ?? p.structured?.min_price, p.minPriceMinor);
  const max = rupees(p.maxPrice ?? p.structured?.max_price, p.maxPriceMinor);
  if (min || max) {
    // Both names, as the web sends them (the backend reads either).
    set('price_min', min || undefined);
    set('min_price', min || undefined);
    set('price_max', max || undefined);
    set('max_price', max || undefined);
    chips.push({ key: 'price', kind: 'price', min: min || null, max: max || null });
  }

  if (has(p.seatingCapacity) || has(p.minSeats) || has(p.maxSeats)) {
    set('seating_capacity', p.seatingCapacity);
    set('seats_min', p.minSeats);
    set('seats_max', p.maxSeats);
    chips.push({ key: 'seats', kind: 'seats', value: p.seatingCapacity ?? p.minSeats ?? p.maxSeats });
  }
  if (has(p.maxKilometersDriven)) {
    set('odometer_max', p.maxKilometersDriven);
    chips.push({ key: 'km', kind: 'km', value: p.maxKilometersDriven });
  }
  if (has(p.minMileage) || has(p.maxMileage)) {
    set('mileage_min', p.minMileage);
    set('mileage_max', p.maxMileage);
    chips.push({ key: 'mileage', kind: 'mileage', value: p.minMileage ?? p.maxMileage });
  }
  if (has(p.minEngineCc) || has(p.maxEngineCc)) {
    set('engine_cc_min', p.minEngineCc);
    set('engine_cc_max', p.maxEngineCc);
    chips.push({ key: 'engine', kind: 'engine', value: p.minEngineCc ?? p.maxEngineCc });
  }
  if (has(p.minBhp) || has(p.maxBhp)) {
    set('bhp_min', p.minBhp);
    set('bhp_max', p.maxBhp);
    chips.push({ key: 'power', kind: 'power', value: p.minBhp ?? p.maxBhp });
  }
  if (p.driveType) {
    set('drive_type', p.driveType);
    chips.push({ key: 'drive', kind: 'text', value: p.driveType });
  }
  if (list(p.features)) {
    set('features', p.features.join(','));
    chips.push({ key: 'features', kind: 'text', value: p.features.join(', ') });
  }
  const excluded = [
    ...(list(p.exclude?.fuelType) ?? []),
    ...(list(p.exclude?.color) ?? []),
    ...(list(p.exclude?.transmission) ?? []),
  ];
  if (excluded.length) {
    if (list(p.exclude?.fuelType)) set('exclude_fuel', p.exclude.fuelType.join(','));
    if (list(p.exclude?.color)) set('exclude_color', p.exclude.color.join(','));
    if (list(p.exclude?.transmission)) set('exclude_transmission', p.exclude.transmission.join(','));
    chips.push({ key: 'exclude', kind: 'exclude', value: excluded.join(', ') });
  }

  return chips.length ? { filters, chips } : null;
};

// The understood filters without the chips the user removed.
export const withoutChips = (smart, removed = []) => {
  if (!smart) {
    return null;
  }
  const drop = new Set(removed.flatMap(key => CHIP_PARAMS[key] ?? []));
  const filters = Object.fromEntries(Object.entries(smart.filters).filter(([key]) => !drop.has(key)));
  const chips = smart.chips.filter(chip => !removed.includes(chip.key));
  return { filters, chips };
};
