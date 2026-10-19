import { formatDate, formatPriceRange } from '../../../utils/format';
import { codeLabel, keyLabel } from '../../../i18n/vehicleLabels';

const date = iso => (iso ? formatDate(iso.slice(0, 10)) : null);

// Registry vehicle -> rows for the "Details" card (empty values are left out).
// `t` translates the labels.
export const toDetailRows = (vehicle, t) =>
  [
    { label: t('valuation.details.variant'), value: vehicle.variant },
    {
      label: t('valuation.details.category'),
      value: keyLabel(t, vehicle.categoryKey, vehicle.category, 'marketplace.vehicleType'),
    },
    {
      label: t('valuation.details.fuelType'),
      value: codeLabel(t, 'marketplace.fuel', vehicle.fuelCode, vehicle.fuel),
    },
    {
      label: t('valuation.details.registeredAt'),
      value: [vehicle.rcCity, vehicle.rcState].filter(Boolean).join(', ') || null,
    },
    { label: t('valuation.details.registrationDate'), value: date(vehicle.registrationDate) },
    { label: t('valuation.details.owners'), value: vehicle.ownerCount },
    {
      label: t('valuation.details.color'),
      value: codeLabel(t, 'marketplace.colour', vehicle.color, vehicle.color),
    },
    {
      label: t('valuation.details.bodyType'),
      value: codeLabel(t, 'marketplace.bodyType', vehicle.bodyType, vehicle.bodyType),
    },
    {
      label: t('valuation.details.engine'),
      value: vehicle.engineCc ? t('valuation.details.engineValue', { cc: vehicle.engineCc }) : null,
    },
    { label: t('valuation.details.seats'), value: vehicle.seats },
    { label: t('valuation.details.insurance'), value: vehicle.insuranceCompany },
    { label: t('valuation.details.insuranceValidTo'), value: date(vehicle.insuranceUpto) },
    { label: t('valuation.details.pucValidTo'), value: date(vehicle.pucUpto) },
    { label: t('valuation.details.fitnessValidTo'), value: date(vehicle.fitnessUpto) },
    { label: t('valuation.details.taxValidTo'), value: date(vehicle.taxUpto) },
    { label: t('valuation.details.financed'), value: vehicle.financed },
  ].filter(row => row.value != null && row.value !== '');

// Price bands (rupees) -> rows for the "Price bands" card.
export const toPriceBandRows = ({ distress, auction, tradeIn, retail }, t) => [
  { label: t('valuation.band.distress'), value: formatPriceRange(distress) },
  { label: t('valuation.band.auction'), value: formatPriceRange(auction) },
  { label: t('valuation.band.tradeIn'), value: formatPriceRange(tradeIn) },
  { label: t('valuation.band.retail'), value: formatPriceRange(retail) },
];
