// Places and addresses for the booking map: search a place by name, and the
// address at a point. OpenStreetMap's free Nominatim service - the same map
// data as the booking map (and the web's), no API key.
// Usage policy: an identifying User-Agent, and at most ~1 request a second
// (the screens debounce typing and only look up on a tap).
import { tNow } from '../../i18n';

const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'TuragApp/1.0 (https://turag.ai)',
  'Accept-Language': 'en',
};
// Results near Pune / Pimpri-Chinchwad first (not a hard limit).
const PUNE_VIEWBOX = '73.60,18.80,74.15,18.35';
const TIMEOUT_MS = 10000;

const getJson = async url => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) {
      throw new Error(tNow('booking.address.lookupError'));
    }
    return await res.json();
  } catch {
    throw new Error(tNow('booking.address.lookupError'));
  } finally {
    clearTimeout(timer);
  }
};

// The backend books doorstep inspections in these cities (null = elsewhere).
const cityCode = text => {
  const value = String(text ?? '').toLowerCase();
  if (value.includes('pimpri') || value.includes('chinchwad')) {
    return 'PCMC';
  }
  if (value.includes('pune')) {
    return 'PUNE';
  }
  return null;
};

// Nominatim result -> { lat, lng, title, subtitle, building, street, area, pincode, city, cityName }
// area: locality; city: 'PUNE' | 'PCMC' | null (outside the booking cities).
export const mapPlace = item => {
  const a = item.address ?? {};
  const building = [a.house_number, a.building || a.amenity || a.shop].filter(Boolean).join(', ');
  const street = a.road || a.pedestrian || a.residential || '';
  const area = a.suburb || a.neighbourhood || a.quarter || a.city_district || a.village || '';
  const cityName = a.city || a.town || a.municipality || a.county || a.state_district || '';
  const postcode = String(a.postcode ?? '').replace(/\D/g, '');
  const title = item.name || building || street || area || cityName || item.display_name;
  return {
    lat: Number(item.lat),
    lng: Number(item.lon),
    title,
    subtitle: [area, cityName, postcode].filter(Boolean).filter(part => part !== title).join(', '),
    building,
    street,
    area,
    pincode: postcode.length === 6 ? postcode : '',
    city: cityCode(`${cityName} ${a.city_district ?? ''} ${a.county ?? ''} ${item.display_name ?? ''}`),
    cityName,
  };
};

// Places matching `query` (India, near Pune first). Up to 5.
export const searchPlaces = async query => {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'in',
    viewbox: PUNE_VIEWBOX,
    limit: '5',
  });
  const data = await getJson(`${BASE}/search?${params}`);
  return (Array.isArray(data) ? data : []).map(mapPlace);
};

// The address at a point (a map tap / the phone's location), or null.
export const addressAt = async (lat, lng) => {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  });
  const data = await getJson(`${BASE}/reverse?${params}`);
  return data && !data.error ? mapPlace(data) : null;
};
