// Vehicle / marketplace API (buyer side, no sign-in needed).
// Real backend when USE_REAL_API.marketplace is true (src/api/config.js), mock otherwise.
import { ApiError, request } from '../client';
import { USE_REAL_API } from '../config';
import { tNow } from '../../i18n';
import { ENDPOINTS } from '../endpoints';
import { CATEGORY_TO_API, mapListingDetail, mapListingSummary } from '../mappers/listing';
import sampleVehicles from '../mock/vehicles';
import listings from '../mock/listings';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.marketplace;

// The backend returns at most 24 per page.
export const PAGE_SIZE = 24;

// { a: 1, b: undefined } -> "?a=1" (React Native has no full URLSearchParams).
const toQuery = params => {
  const parts = Object.entries(params)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

// Grades in order, for "Grade B & above" (mock data also has B+).
const GRADE_RANK = { E: 1, D: 2, C: 3, B: 4, 'B+': 4.5, A: 5, 'A+': 6, A_PLUS: 6 };

// MOCK: same filter rules as the backend.
const mockSearch = ({ query, category, filters }) => {
  const search = query.trim().toLowerCase();
  const items = [...listings, ...sampleVehicles].filter(
    vehicle =>
      (category === 'all' || vehicle.category === category) &&
      (!search || vehicle.name.toLowerCase().includes(search)) &&
      (!filters.city || vehicle.city?.toLowerCase() === filters.city.toLowerCase()) &&
      (!filters.fuel || vehicle.fuel?.toLowerCase() === filters.fuel.toLowerCase()) &&
      (!filters.grade_min || (GRADE_RANK[vehicle.grade] ?? 0) >= GRADE_RANK[filters.grade_min]) &&
      (!filters.make || vehicle.name.toLowerCase().includes(filters.make.toLowerCase())) &&
      (!filters.model || vehicle.name.toLowerCase().includes(filters.model.toLowerCase())) &&
      (!filters.price_min || vehicle.price >= filters.price_min) &&
      (!filters.price_max || vehicle.price <= filters.price_max),
  );
  return { items, nextCursor: null };
};

// Marketplace grid. filters (backend parameter names): { city?, fuel?, make?,
// model?, body_type?, transmission?, grade_min?, price_min?, price_max? (rupees) }.
// cursor: the previous page's nextCursor (null = first page).
// Returns { items, nextCursor } - nextCursor is null on the last page.
export const getMarketplaceVehicles = async ({
  query = '',
  category = 'all',
  filters = {},
  cursor = null,
} = {}) => {
  if (!real()) {
    await wait(400);
    return mockSearch({ query, category, filters });
  }
  const data = await request(
    `${ENDPOINTS.MARKETPLACE_LISTINGS}${toQuery({
      q: query.trim() || undefined,
      category: CATEGORY_TO_API[category],
      city: filters.city,
      fuel: filters.fuel,
      make: filters.make,
      model: filters.model,
      body_type: filters.body_type,
      transmission: filters.transmission,
      grade_min: filters.grade_min,
      price_min: filters.price_min,
      price_max: filters.price_max,
      limit: PAGE_SIZE,
      cursor,
    })}`,
    { auth: false },
  );
  return {
    items: (data.data ?? []).map(mapListingSummary),
    nextCursor: data.next_cursor ?? null,
  };
};

const VEHICLE_TYPES = { cars: 'Four Wheeler', bikes: 'Two Wheeler', commercial: 'Commercial' };

// Full details for the vehicle page.
export const getVehicleDetails = async vehicleId => {
  if (!real()) {
    await wait(300);
    const vehicle = [...listings, ...sampleVehicles].find(v => v.id === vehicleId);
    if (!vehicle) {
      throw new Error(tNow('errors.vehicleUnavailable'));
    }
    return {
      ...vehicle,
      images: vehicle.image ? [vehicle.image] : [],
      vehicleType: VEHICLE_TYPES[vehicle.category] ?? 'Vehicle',
      inspection: vehicle.verified ? 'TURAG Verified' : 'Not inspected yet',
      eligible: true,
      description: `A well-maintained ${vehicle.name}, ideal for everyday use. Explore its history, condition, and key details before making your decision.`,
    };
  }
  try {
    const data = await request(ENDPOINTS.marketplaceListing(vehicleId), { auth: false });
    return mapListingDetail(data.listing);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: tNow('errors.vehicleUnavailable') });
    }
    throw e;
  }
};
