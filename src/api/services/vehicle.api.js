// Vehicle / marketplace API (buyer side, no sign-in needed).
// Real backend when USE_REAL_API.marketplace is true (src/api/config.js), mock otherwise.
import { ApiError, request } from '../client';
import { BACKEND_URL, USE_REAL_API } from '../config';
import { tNow } from '../../i18n';
import { ENDPOINTS } from '../endpoints';
import { CATEGORY_TO_API, mapListingDetail, mapListingSummary } from '../mappers/listing';
import { mapSearchParse } from '../mappers/searchParse';
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

const SEARCH_PARSE_TIMEOUT_MS = 6000;

// Smart search (as the web's parseQueryWithAi): what a typed / spoken search
// means, e.g. "diesel SUV under 10 lakh in Pune" -> fuel, body type, price and
// city. The server's own parser (/api/ai/search-parse, no sign-in). Returns
// mapSearchParse's { filters, chips }, or null when nothing was understood or
// it couldn't be asked (the search then goes as plain text).
export const parseSearchQuery = async query => {
  const text = query.trim();
  if (!text || !real()) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_PARSE_TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/search-parse?q=${encodeURIComponent(text)}`, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      signal: controller.signal,
    });
    const data = res.ok ? await res.json() : null;
    return data?.success ? mapSearchParse(data.parsed) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// Marketplace grid. filters (backend parameter names): { city?, fuel?, make?,
// model?, body_type?, transmission?, grade_min?, tier? ('BUDGET' | 'ASSURED' |
// 'PREMIUM'), price_min?, price_max? (rupees) }.
// smart: what smart search understood (parseSearchQuery's filters, any
// backend names) - then the text isn't sent as well, as on the web; the
// filters picked on screen win over it.
// cursor: the previous page's nextCursor (null = first page).
// Returns { items, closest, nextCursor } - nextCursor is null on the last page;
// closest: the backend's nearest vehicles when nothing matches exactly.
export const getMarketplaceVehicles = async ({
  query = '',
  category = 'all',
  filters = {},
  smart = null,
  cursor = null,
} = {}) => {
  if (!real()) {
    await wait(400);
    return { ...mockSearch({ query, category, filters }), closest: [] };
  }
  const understood = smart && Object.keys(smart).length > 0 ? smart : null;
  const data = await request(
    `${ENDPOINTS.MARKETPLACE_LISTINGS}${toQuery({
      ...understood,
      q: understood ? undefined : query.trim() || undefined,
      category: CATEGORY_TO_API[category] ?? understood?.category,
      city: filters.city ?? understood?.city,
      fuel: filters.fuel ?? understood?.fuel,
      make: filters.make ?? understood?.make,
      model: filters.model ?? understood?.model,
      body_type: filters.body_type ?? understood?.body_type,
      transmission: filters.transmission ?? understood?.transmission,
      grade_min: filters.grade_min,
      tier: filters.tier,
      price_min: filters.price_min ?? understood?.price_min,
      price_max: filters.price_max ?? understood?.price_max,
      min_price: filters.price_min ?? understood?.min_price,
      max_price: filters.price_max ?? understood?.max_price,
      limit: PAGE_SIZE,
      cursor,
    })}`,
    { auth: false },
  );
  return {
    items: (data.data ?? []).map(mapListingSummary),
    closest: cursor ? [] : (data.closest_matches ?? []).map(mapListingSummary),
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
