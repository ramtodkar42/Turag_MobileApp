/**
 * Smart search (as the web's AI search: /api/ai/search-parse -> marketplace
 * filters, removable chips, closest matches) and the report's "Verify this
 * report" card. The parser answers are the live server's own (turag.ai,
 * 2026-10-28).
 */
import React from 'react';
import { Linking } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { mapSearchParse, withoutChips } from '../src/api/mappers/searchParse';
import { getMarketplaceVehicles, parseSearchQuery } from '../src/api/services/vehicle.api';
import { USE_REAL_API } from '../src/api/config';
import smartChipLabel from '../src/screens/home/Home/smartChipLabel';
import useMarketplace from '../src/screens/home/Home/useMarketplace';
import VerifyReportCard from '../src/screens/account/InspectionReport/components/VerifyReportCard';
import { mapReport } from '../src/api/mappers/booking';
import { tNow } from '../src/i18n';

const DIESEL_SUV = {
  queryText: 'diesel SUV under 10 lakh in Pune',
  interpretation: ['Diesel', 'SUV', 'Max Price: ₹10,00,000', 'Pune'],
  features: [],
  fuelType: 'DIESEL',
  bodyType: 'SUV',
  vehicleType: 'CAR',
  category: 'PASSENGER',
  maxPrice: 1000000,
  maxPriceMinor: 100000000,
  city: 'PUNE',
  structured: { max_price: 1000000, min_price: null },
};
const CRETA = {
  queryText: 'automatic petrol hyundai creta 2020 below 8 lakh white',
  features: [],
  transmission: 'AUTOMATIC',
  fuelType: 'PETROL',
  color: 'White',
  year: 2020,
  minYear: 2020,
  maxYear: 2020,
  maxPrice: 800000,
  model: 'Creta',
  brand: 'Hyundai',
  category: 'PASSENGER',
};

const reply = body => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});
const listing = id => ({ listing_id: id, vehicle: { make: 'Tata', model: 'Harrier' }, ask_price: { amount_minor: 90000000 } });
const params = url => Object.fromEntries(new URL(url).searchParams.entries());

describe('understanding a search', () => {
  test('"diesel SUV under 10 lakh in Pune" -> the web’s filters and its chips', () => {
    const smart = mapSearchParse(DIESEL_SUV);
    expect(smart.filters).toEqual({
      vehicle_type: 'CAR',
      category: 'PASSENGER',
      body_type: 'SUV',
      fuel: 'DIESEL',
      city: 'PUNE',
      price_max: 1000000,
      max_price: 1000000,
    });
    expect(smart.chips.map(c => smartChipLabel(tNow, c))).toEqual(['Cars', 'SUV', 'Diesel', 'Pune', 'Up to ₹10L']);
  });

  test('brand, model, year, colour and transmission', () => {
    const smart = mapSearchParse(CRETA);
    expect(smart.filters).toEqual(
      expect.objectContaining({ make: 'Hyundai', model: 'Creta', year: 2020, color: 'White', transmission: 'AUTOMATIC' }),
    );
    expect(smart.chips.map(c => smartChipLabel(tNow, c))).toEqual(
      expect.arrayContaining(['Hyundai', 'Creta', 'Automatic', 'Petrol', 'White', '2020', 'Up to ₹8L']),
    );
  });

  test('nothing understood: null (the search goes as plain text)', () => {
    expect(mapSearchParse({ queryText: 'asdf', features: [] })).toBeNull();
    expect(mapSearchParse(null)).toBeNull();
  });

  test('a removed chip drops every filter it stands for', () => {
    const smart = withoutChips(mapSearchParse(DIESEL_SUV), ['price', 'fuel']);
    expect(smart.filters).not.toHaveProperty('fuel');
    expect(smart.filters).not.toHaveProperty('price_max');
    expect(smart.filters).not.toHaveProperty('max_price');
    expect(smart.chips.map(c => c.key)).toEqual(['vehicle', 'body', 'city']);
  });
});

describe('real backend', () => {
  const before = USE_REAL_API.marketplace;
  beforeEach(() => {
    USE_REAL_API.marketplace = true;
    global.fetch = jest.fn();
  });
  afterEach(() => {
    USE_REAL_API.marketplace = before;
  });

  test('asks the server’s parser (no sign-in); a failure is just "not understood"', async () => {
    fetch.mockResolvedValueOnce(reply({ success: true, parsed: DIESEL_SUV }));
    const smart = await parseSearchQuery('  diesel SUV under 10 lakh in Pune ');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/ai\/search-parse\?q=diesel%20SUV%20under%2010%20lakh%20in%20Pune$/);
    expect(init.headers.Authorization).toBeUndefined();
    expect(smart.filters.fuel).toBe('DIESEL');

    fetch.mockRejectedValueOnce(new Error('offline'));
    // Couldn't ask (undefined): plain text this time, asked again next time.
    await expect(parseSearchQuery('swift')).resolves.toBeUndefined();
  });

  test('searches the understood filters instead of the text; filters picked on screen win', async () => {
    fetch.mockResolvedValueOnce(reply({ data: [listing('lst_1')], next_cursor: null, closest_matches: [] }));
    await getMarketplaceVehicles({
      query: 'diesel SUV under 10 lakh in Pune',
      filters: { fuel: 'PETROL' },
      smart: mapSearchParse(DIESEL_SUV).filters,
    });
    const sent = params(fetch.mock.calls[0][0]);
    expect(sent.q).toBeUndefined();
    expect(sent).toEqual(
      expect.objectContaining({ fuel: 'PETROL', body_type: 'SUV', city: 'PUNE', price_max: '1000000', category: 'PASSENGER' }),
    );
  });

  test('nothing understood: the text goes as q; closest matches come back too', async () => {
    fetch.mockResolvedValueOnce(reply({ data: [], next_cursor: null, closest_matches: [listing('lst_9')] }));
    const page = await getMarketplaceVehicles({ query: 'swift' });
    expect(params(fetch.mock.calls[0][0]).q).toBe('swift');
    expect(page.items).toEqual([]);
    expect(page.closest.map(v => v.id)).toEqual(['lst_9']);
  });
});

describe('Home search with smart search', () => {
  const before = USE_REAL_API.marketplace;
  let tree;
  let market;
  function Probe() {
    market = useMarketplace();
    return null;
  }
  const wait = ms => act(async () => new Promise(r => setTimeout(r, ms)));
  const listingCalls = () => fetch.mock.calls.map(c => c[0]).filter(u => u.includes('/marketplace/listings'));

  beforeEach(() => {
    USE_REAL_API.marketplace = true;
    global.fetch = jest.fn(async url =>
      url.includes('/api/ai/search-parse')
        ? reply({ success: true, parsed: DIESEL_SUV })
        : reply({ data: [listing('lst_1')], next_cursor: null, closest_matches: [] }),
    );
  });
  afterEach(() => {
    act(() => tree?.unmount());
    USE_REAL_API.marketplace = before;
  });

  test('a typed search becomes chips; removing one searches again without it', async () => {
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe />);
    });
    await wait(50);
    await act(async () => market.setQuery('diesel SUV under 10 lakh in Pune'));
    await wait(450);
    expect(market.smart.chips.map(c => c.key)).toEqual(['vehicle', 'body', 'fuel', 'city', 'price']);
    expect(params(listingCalls().at(-1)).fuel).toBe('DIESEL');

    await act(async () => market.removeChip('fuel'));
    await wait(50);
    expect(market.smart.chips.map(c => c.key)).not.toContain('fuel');
    expect(params(listingCalls().at(-1)).fuel).toBeUndefined();
    // The text was understood once, not again for the new search.
    expect(fetch.mock.calls.filter(c => c[0].includes('search-parse'))).toHaveLength(1);
  });

  test('no exact match: the closest vehicles show, marked as such', async () => {
    fetch.mockImplementation(async url =>
      url.includes('/api/ai/search-parse')
        ? reply({ success: true, parsed: DIESEL_SUV })
        : reply({ data: [], next_cursor: null, closest_matches: [listing('lst_near')] }),
    );
    await act(async () => {
      tree = ReactTestRenderer.create(<Probe />);
    });
    await act(async () => market.setQuery('diesel SUV under 10 lakh in Pune'));
    await wait(450);
    expect(market.closest).toBe(true);
    expect(market.vehicles.map(v => v.id)).toEqual(['lst_near']);
    expect(market.hasMore).toBe(false);
  });
});

describe('Verify this report', () => {
  const metrics = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

  test('the report carries its token; the card links to turag.ai/verify/<token>', async () => {
    expect(mapReport({ identity: { inspection_id: 'ins_1', verification_token: 'vt_ABC123' } }).verificationToken).toBe(
      'vt_ABC123',
    );
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <VerifyReportCard token="vt_ABC123" />
        </SafeAreaProvider>,
      );
    });
    const texts = tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);
    expect(texts).toEqual(expect.arrayContaining(['Verify this report', 'turag.ai/verify/vt_ABC123', 'Certificate vt_ABC123']));
    await act(async () => tree.root.findByProps({ accessibilityRole: 'link' }).props.onPress());
    expect(open).toHaveBeenCalledWith('https://turag.ai/verify/vt_ABC123');
    act(() => tree.unmount());
  });

  test('no token yet: nothing shown', async () => {
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(<VerifyReportCard token={null} />);
    });
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });
});
