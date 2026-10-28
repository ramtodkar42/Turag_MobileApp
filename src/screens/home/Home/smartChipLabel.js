// A smart-search chip (api/mappers/searchParse) in the app's language:
// "Diesel", "SUV", "Up to ₹10L", "Pune", "2020", "7 seats" ...
import { codeLabel } from '../../../i18n/vehicleLabels';
import { formatNumber, formatPriceShort } from '../../../utils/format';
import { CITIES } from './filterCatalog';

const titleCase = value =>
  String(value ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

const BIKES = new Set(['TWO_WHEELER', 'BIKE', 'SCOOTER', 'MOTORCYCLE']);

const yearLabel = (t, { from, to }) => {
  if (from && to) return from === to ? String(from) : `${from}–${to}`;
  return from ? t('home.smart.yearFrom', { year: from }) : t('home.smart.yearTo', { year: to });
};

const priceLabel = (t, { min, max }) => {
  if (min && max) return `${formatPriceShort(min)} – ${formatPriceShort(max)}`;
  return max
    ? t('home.smart.priceUpTo', { amount: formatPriceShort(max) })
    : t('home.smart.priceFrom', { amount: formatPriceShort(min) });
};

export default function smartChipLabel(t, chip) {
  switch (chip.kind) {
    case 'vehicle':
      return t(BIKES.has(String(chip.value).toUpperCase()) ? 'home.tab.bikes' : 'home.tab.cars');
    case 'fuel':
      return codeLabel(t, 'marketplace.fuel', chip.value, titleCase(chip.value));
    case 'transmission':
      return codeLabel(t, 'marketplace.transmission', chip.value, titleCase(chip.value));
    case 'body':
      return codeLabel(t, 'marketplace.bodyType', chip.value, chip.value);
    case 'city': {
      const known = CITIES.find(c => c.value === String(chip.value).toUpperCase());
      return known ? t(known.labelKey) : titleCase(chip.value);
    }
    case 'year':
      return yearLabel(t, chip);
    case 'price':
      return priceLabel(t, chip);
    case 'seats':
      return t('home.smart.seats', { count: chip.value });
    case 'km':
      return t('home.smart.km', { km: formatNumber(chip.value) });
    case 'mileage':
      return t('home.smart.mileage', { value: chip.value });
    case 'engine':
      return t('home.smart.engine', { value: chip.value });
    case 'power':
      return t('home.smart.power', { value: chip.value });
    case 'exclude':
      return t('home.smart.exclude', { list: titleCase(chip.value) });
    default:
      return chip.value ? String(chip.value).replace(/^\w/, c => c.toUpperCase()) : '';
  }
}
