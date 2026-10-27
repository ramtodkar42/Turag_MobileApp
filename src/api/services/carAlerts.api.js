// WhatsApp car alerts (as the web's Account page, ADR-0044): a buyer's standing
// request to hear on WhatsApp about newly listed cars. 'ALL' = every new car
// (one switch); 'MATCH' = cars matching make / body / fuel / city / budget.
// Messages only go out while the WhatsApp consent is on (profile.api).
import { request } from '../client';
import { ENDPOINTS } from '../endpoints';

// Backend alert -> { id, scope, make, model, bodyType, fuel, transmission, city,
// priceMaxMinor, yearMin }.
const mapAlert = a => ({
  id: a.id,
  scope: a.scope,
  make: a.make ?? null,
  model: a.model ?? null,
  bodyType: a.body_type ?? null,
  fuel: a.fuel ?? null,
  transmission: a.transmission ?? null,
  city: a.city ?? null,
  priceMaxMinor: a.price_max_minor ?? null,
  yearMin: a.year_min ?? null,
});

export const listCarAlerts = async () =>
  ((await request(ENDPOINTS.CAR_ALERTS)).alerts ?? []).map(mapAlert);

// scope 'ALL', or 'MATCH' with any of { make, bodyType, fuel, city, priceMaxMinor }
// (left out = any). Throws CAR_ALERT_LIMIT_REACHED when the user has the most allowed.
export const createCarAlert = async ({
  scope = 'MATCH',
  make,
  bodyType,
  fuel,
  city,
  priceMaxMinor,
}) => {
  const body = { scope };
  if (scope === 'MATCH') {
    if (make) body.make = make;
    if (bodyType) body.body_type = bodyType;
    if (fuel) body.fuel = fuel;
    if (city) body.city = city;
    if (priceMaxMinor != null) body.price_max_minor = priceMaxMinor;
  }
  return mapAlert(
    (await request(ENDPOINTS.CAR_ALERTS, { method: 'POST', body })).alert,
  );
};

export const deleteCarAlert = id =>
  request(ENDPOINTS.carAlert(id), { method: 'DELETE' });
