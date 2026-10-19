import { makesFor, modelsFor } from './filterCatalog';

// Brand / model names are shown as they are (not translated).
const named = names => names.map(name => ({ value: name, label: name }));

const isBike = filters => filters.vehicle === 'bikes';

// Price ranges in rupees ("min-max", max may be empty): car budgets, and
// bike budgets once Bike is picked.
const CAR_PRICES = [
  { value: '0-500000', labelKey: 'home.filter.price.under5' },
  { value: '500000-1000000', labelKey: 'home.filter.price.5to10' },
  { value: '1000000-1500000', labelKey: 'home.filter.price.10to15' },
  { value: '1500000-2000000', labelKey: 'home.filter.price.15to20' },
  { value: '2000000-', labelKey: 'home.filter.price.over20' },
];
const BIKE_PRICES = [
  { value: '0-50000', labelKey: 'home.filter.price.bikeUnder50k' },
  { value: '50000-100000', labelKey: 'home.filter.price.bike50kTo1' },
  { value: '100000-200000', labelKey: 'home.filter.price.bike1to2' },
  { value: '200000-300000', labelKey: 'home.filter.price.bike2to3' },
  { value: '300000-', labelKey: 'home.filter.price.bikeOver3' },
];

const FUELS = [
  { value: 'PETROL', labelKey: 'home.filter.fuel.petrol' },
  { value: 'DIESEL', labelKey: 'home.filter.fuel.diesel' },
  { value: 'CNG', labelKey: 'home.filter.fuel.cng' },
  { value: 'ELECTRIC', labelKey: 'home.filter.fuel.electric' },
];
// Bikes run on petrol or electric.
const BIKE_FUELS = ['PETROL', 'ELECTRIC'];

// Quick filters under the search bar (the web marketplace's quick filters,
// plus Car / Bike), in this order. Each is a dropdown (one choice; "All"
// clears it) and several can be on at once. `id` is the backend search
// parameter (GET /marketplace/listings), except:
//   city    - picked state first, then city (LocationSheet; kind 'location')
//   price   - a "min-max" range in rupees, sent as price_min / price_max
//   vehicle - Car / Bike: the same as Home's Cars / Bikes tabs (category)
// Options have a labelKey (translated) or a label (brand / model names).
// Picking Bike makes the rest fit bikes:
//   getOptions(filters) - options that depend on other filters
//   icon(filters)       - an icon that follows Car / Bike
//   hideFor             - vehicle types it doesn't apply to (hidden)
export const QUICK_FILTERS = [
  {
    id: 'city',
    kind: 'location',
    labelKey: 'home.filter.location',
    icon: 'mapPin',
  },
  {
    id: 'price',
    labelKey: 'home.filter.price',
    icon: 'rupee',
    getOptions: filters => (isBike(filters) ? BIKE_PRICES : CAR_PRICES),
  },
  {
    id: 'vehicle',
    labelKey: 'home.filter.vehicle',
    icon: filters => (isBike(filters) ? 'bike' : 'car'),
    options: [
      { value: 'cars', labelKey: 'home.filter.vehicle.car' },
      { value: 'bikes', labelKey: 'home.filter.vehicle.bike' },
    ],
  },
  {
    id: 'make',
    labelKey: 'home.filter.make',
    icon: filters => (isBike(filters) ? 'bike' : 'carFront'),
    // Car makes for Car, bike makes for Bike, every make otherwise.
    getOptions: filters => named(makesFor(filters.vehicle)),
  },
  {
    id: 'model',
    labelKey: 'home.filter.model',
    icon: 'grid',
    // Only the chosen make's models (and only cars / bikes when picked).
    getOptions: filters => named(modelsFor(filters)),
  },
  {
    id: 'fuel',
    labelKey: 'home.filter.fuel',
    icon: 'fuel',
    getOptions: filters => (isBike(filters) ? FUELS.filter(f => BIKE_FUELS.includes(f.value)) : FUELS),
  },
  {
    id: 'body_type',
    labelKey: 'home.filter.body',
    icon: 'carBody',
    hideFor: ['bikes'],
    options: [
      { value: 'HATCHBACK', labelKey: 'home.filter.body.hatchback' },
      { value: 'SEDAN', labelKey: 'home.filter.body.sedan' },
      { value: 'SUV', labelKey: 'home.filter.body.suv' },
      { value: 'MUV', labelKey: 'home.filter.body.muv' },
    ],
  },
  {
    id: 'transmission',
    hideFor: ['bikes'],
    labelKey: 'home.filter.transmission',
    icon: 'gear',
    options: [
      { value: 'MANUAL', labelKey: 'home.filter.transmission.manual' },
      { value: 'AUTOMATIC', labelKey: 'home.filter.transmission.automatic' },
    ],
  },
  {
    id: 'grade_min',
    labelKey: 'home.filter.grade',
    icon: 'star',
    // "This grade or better" on the backend.
    options: [
      { value: 'A_PLUS', labelKey: 'home.filter.grade.aPlus' },
      { value: 'A', labelKey: 'home.filter.grade.a' },
      { value: 'B', labelKey: 'home.filter.grade.b' },
    ],
  },
];

// None on at first: Home shows every vehicle. { [filter id]: option value }
export const DEFAULT_FILTERS = {};

// The filters shown for the current Car / Bike choice.
export const visibleFilters = filters =>
  QUICK_FILTERS.filter(item => !item.hideFor?.includes(filters.vehicle));

// A filter's options for the other choices.
export const optionsOf = (item, filters) => (item.getOptions ? item.getOptions(filters) : item.options ?? []);

// Drops choices that no longer fit (e.g. Diesel, a car price, Body Type or a
// car make once Bike is picked; a model of another make). Checked in order,
// so a model is checked against the make that's left.
export const fitFilters = filters => {
  const next = { ...filters };
  QUICK_FILTERS.forEach(item => {
    if (item.kind === 'location' || item.id === 'vehicle' || next[item.id] == null) {
      return;
    }
    const hidden = item.hideFor?.includes(next.vehicle);
    if (hidden || !optionsOf(item, next).some(option => option.value === next[item.id])) {
      delete next[item.id];
    }
  });
  return next;
};

// Category tabs. `comingSoon`: not on the marketplace yet (no request is made).
export const CATEGORIES = [
  { id: 'all', labelKey: 'home.tab.all' },
  { id: 'cars', labelKey: 'home.tab.cars' },
  { id: 'bikes', labelKey: 'home.tab.bikes' },
  { id: 'commercial', labelKey: 'home.tab.commercial', comingSoon: true },
];
