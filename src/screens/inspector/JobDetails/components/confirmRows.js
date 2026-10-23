import { formatDate } from '../../../../utils/format';
import { codeLabel, keyLabel } from '../../../../i18n/vehicleLabels';

const date = iso => (iso ? formatDate(String(iso).slice(0, 10)) : null);

// The registry says 'true' / 'false' (sometimes a boolean): Yes / No.
const yesNo = (value, t) => {
  if (value == null || value === '') {
    return null;
  }
  const text = String(value).toLowerCase();
  if (text === 'true') return t('common.yes');
  if (text === 'false') return t('common.no');
  return String(value);
};

// The proposed vehicle -> the rows of the "Is this the vehicle?" card, as the
// web's M2 card: variant, fuel, category, engine, where registered, RC status,
// insurance (company + expiry), fitness, tax, financed, owners. Only the
// non-personal registry facts; empty values are left out.
export const confirmRows = (vehicle, t) =>
  [
    { label: t('valuation.details.variant'), value: vehicle.variant },
    { label: t('valuation.details.fuelType'), value: codeLabel(t, 'marketplace.fuel', vehicle.fuelCode, vehicle.fuel) },
    {
      label: t('valuation.details.category'),
      value: keyLabel(t, vehicle.categoryKey, vehicle.category, 'marketplace.vehicleType'),
    },
    {
      label: t('valuation.details.engine'),
      value: vehicle.engineCc ? t('valuation.details.engineValue', { cc: vehicle.engineCc }) : null,
    },
    {
      label: t('valuation.details.registeredAt'),
      value: [vehicle.rcCity, vehicle.rcState].filter(Boolean).join(', ') || null,
    },
    { label: t('inspector.start.rcStatus'), value: vehicle.rcStatus },
    { label: t('valuation.details.insurance'), value: vehicle.insuranceCompany },
    { label: t('valuation.details.insuranceValidTo'), value: date(vehicle.insuranceUpto) },
    { label: t('valuation.details.fitnessValidTo'), value: date(vehicle.fitnessUpto) },
    { label: t('valuation.details.taxValidTo'), value: date(vehicle.taxUpto) },
    { label: t('valuation.details.financed'), value: yesNo(vehicle.financed, t) },
    { label: t('valuation.details.owners'), value: vehicle.ownerCount },
  ].filter(row => row.value != null && row.value !== '');
