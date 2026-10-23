import { MAKES } from '../home/Home/filterCatalog';

// Brand logos for the search screen's "Popular brands" (bundled, small PNGs).
// A brand without a logo shows its initials instead (see BrandTile).
const LOGOS = {
  'Maruti Suzuki': require('../../assets/images/brands/maruti-suzuki.png'),
  Hyundai: require('../../assets/images/brands/hyundai.png'),
  Honda: require('../../assets/images/brands/honda.png'),
  Tata: require('../../assets/images/brands/tata.png'),
  Mahindra: require('../../assets/images/brands/mahindra.png'),
  Toyota: require('../../assets/images/brands/toyota.png'),
  Kia: require('../../assets/images/brands/kia.png'),
  Renault: require('../../assets/images/brands/renault.png'),
  Volkswagen: require('../../assets/images/brands/volkswagen.png'),
  Skoda: require('../../assets/images/brands/skoda.png'),
  Ford: require('../../assets/images/brands/ford.png'),
  MG: require('../../assets/images/brands/mg.png'),
  Nissan: require('../../assets/images/brands/nissan.png'),
  'Royal Enfield': require('../../assets/images/brands/royal-enfield.png'),
  Bajaj: require('../../assets/images/brands/bajaj.png'),
  Hero: require('../../assets/images/brands/hero.png'),
  Yamaha: require('../../assets/images/brands/yamaha.png'),
  Suzuki: require('../../assets/images/brands/suzuki.png'),
  KTM: require('../../assets/images/brands/ktm.png'),
  Kawasaki: require('../../assets/images/brands/kawasaki.png'),
};

export const logoOf = name => LOGOS[name] ?? null;

// "Popular brands" on the search screen: the same nine on every tab, cars and
// bikes mixed (3 x 3 grid), each with its logo. Names match the Make filter.
const POPULAR = [
  'Maruti Suzuki',
  'Hyundai',
  'Tata',
  'Mahindra',
  'Toyota',
  'Honda',
  'Royal Enfield',
  'Bajaj',
  'Hero',
];

// Returns [{ name, logo }].
export const popularBrands = () => POPULAR.map(name => ({ name, logo: logoOf(name) }));

// Whether a brand is on Home's tab ('cars' | 'bikes'; any other tab shows all).
export const brandFits = (name, vehicle) => {
  if (vehicle !== 'cars' && vehicle !== 'bikes') return true;
  return !!MAKES.find(m => m.name === name)?.[vehicle];
};

// Suggestions while typing (brands first, then "brand model"), matching every
// word typed: [{ kind: 'brand' | 'model', label, make, logo }]. Max `limit`.
export const suggestionsFor = (text, vehicle, limit = 8) => {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const matches = label => words.every(w => label.toLowerCase().includes(w));
  const types = vehicle === 'cars' || vehicle === 'bikes' ? [vehicle] : ['cars', 'bikes'];
  const makes = MAKES.filter(m => types.some(type => m[type]));
  const brands = makes
    .filter(m => matches(m.name))
    .map(m => ({ kind: 'brand', label: m.name, make: m.name, logo: logoOf(m.name) }));
  const models = makes.flatMap(m =>
    types
      .flatMap(type => m[type] ?? [])
      .map(model => `${m.name} ${model}`)
      .filter(matches)
      .map(label => ({ kind: 'model', label, make: m.name, logo: logoOf(m.name) })),
  );
  return [...brands, ...models].slice(0, limit);
};
