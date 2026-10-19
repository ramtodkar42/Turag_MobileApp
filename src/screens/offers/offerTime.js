import { tNow } from '../../i18n';

const HOUR = 60 * 60 * 1000;

// Time left on an offer: "Expires in 5 hr" / "Expires in 2 days" / "Expired".
export const expiresLabel = (expiresAt, now = Date.now()) => {
  const left = expiresAt - now;
  if (left <= 0) {
    return tNow('offers.expired');
  }
  const hours = Math.ceil(left / HOUR);
  return hours >= 48
    ? tNow('offers.expiresInDays', { count: Math.floor(hours / 24) })
    : tNow('offers.expiresInHours', { count: hours });
};

// "Maruti Suzuki Swift 2018" (or the fallback when the backend sends no vehicle).
export const vehicleName = (vehicle, fallback) =>
  vehicle ? [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') : fallback;
