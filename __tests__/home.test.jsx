/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Home from '../src/screens/home/Home/Home';
import { getMarketplaceVehicles } from '../src/api/services/vehicle.api';
import { formatPriceShort } from '../src/utils/format';
import { VehicleGridSkeleton } from '../src/components';

// Home refreshes the bell on focus; here, once after mounting.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;

const renderHome = async () => {
  jest.useFakeTimers();
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Home />
      </SafeAreaProvider>,
    );
  });
  await settle();
  return tree.root;
};

// Let debounce + mock API delay finish (two rounds: the debounced search
// starts its request only after the first round re-renders).
const settle = async () => {
  for (let i = 0; i < 2; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
};

const cardTitles = root =>
  root.findAll(n => n.props.meta && n.props.title && n.props.price).map(n => n.props.title);

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('formatPriceShort matches the design', () => {
  expect(formatPriceShort(880000)).toBe('₹8.8L');
  expect(formatPriceShort(228000)).toBe('₹2.28L');
  expect(formatPriceShort(200000)).toBe('₹2L');
  expect(formatPriceShort(15000000)).toBe('₹1.5Cr');
});

test('mock API filters by category, search and chip filters', async () => {
  const bikes = await getMarketplaceVehicles({ category: 'bikes' });
  expect(bikes.items.map(v => v.name)).toEqual(['Yamaha RX 100']);
  expect(bikes.nextCursor).toBeNull();

  const search = await getMarketplaceVehicles({ query: 'hyundai' });
  expect(search.items).toHaveLength(3);

  const diesel = await getMarketplaceVehicles({ filters: { fuel: 'Diesel' } });
  expect(diesel.items.map(v => v.name)).toEqual(['Tata Ace']);

  const gradeB = await getMarketplaceVehicles({ filters: { grade_min: 'B' } });
  expect(gradeB.items.length).toBe(8);
  const gradeA = await getMarketplaceVehicles({ filters: { grade_min: 'A' } });
  expect(gradeA.items.map(v => v.grade)).toEqual(['A', 'A']);
});

// A search made on the search screen comes back to Home as { query } (the
// search screen's own tests are in search.test.jsx). Returns the navigation.
const searchFor = async text => {
  const navigation = { navigate: jest.fn(), setParams: jest.fn() };
  await act(async () =>
    tree.update(
      <SafeAreaProvider initialMetrics={metrics}>
        <Home navigation={navigation} route={{ params: { query: text } }} />
      </SafeAreaProvider>,
    ),
  );
  return navigation;
};

const tab = (root, label) =>
  root
    .findAll(n => n.props.accessibilityRole === 'tab' && n.props.onPress)
    .find(n => n.findAll(c => c.props.children === label).length > 0);

test('Home shows placeholders first, then all vehicles, then filters by category tab', async () => {
  jest.useFakeTimers();
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Home />
      </SafeAreaProvider>,
    );
  });
  expect(tree.root.findAllByType(VehicleGridSkeleton)).toHaveLength(1);
  await settle();
  const root = tree.root;
  expect(root.findAllByType(VehicleGridSkeleton)).toHaveLength(0);
  expect(cardTitles(root)).toHaveLength(8);

  await act(async () => tab(root, 'Bikes').props.onPress());
  await settle();
  expect(cardTitles(root)).toEqual(['Yamaha RX 100']);
});

test('No Commercial tab until the marketplace lists commercial vehicles', async () => {
  const root = await renderHome();
  expect(tab(root, 'Commercial')).toBeUndefined();
});

// Quick filters: the pill for a filter (by its name), and picking an option
// from its sheet (by the option's label; 'All' clears it).
const filterPill = (root, name) =>
  root.findAll(
    n => n.props.accessibilityRole === 'button' && n.props.onPress &&
      (n.props.accessibilityLabel === name || n.props.accessibilityLabel?.startsWith(`${name}: `)),
  )[0];
const openSheet = root => root.findAll(n => n.props.options && n.props.onSelect && n.props.visible)[0];
const sheetLabels = root => openSheet(root).props.options.map(o => o.label);
const pickFilter = async (root, name, optionLabel) => {
  await act(async () => filterPill(root, name).props.onPress());
  const sheet = openSheet(root);
  const option = sheet.props.options.find(o => o.label === optionLabel);
  await act(async () => {
    sheet.props.onSelect(option.value);
    sheet.props.onClose();
  });
  await settle();
};
// A row in the location sheet, by its text.
const sheetRow = (root, text) =>
  root.findAll(n => n.props.onPress && n.props.accessibilityState && n.findAll(c => c.props.children === text).length > 0)[0];
const pickLocation = async (root, ...rows) => {
  await act(async () => filterPill(root, 'Location').props.onPress());
  for (const text of rows) {
    await act(async () => sheetRow(root, text).props.onPress());
  }
  await settle();
};

test('Picking Diesel in Fuel Type narrows the grid', async () => {
  const root = await renderHome();
  await pickFilter(root, 'Fuel Type', 'Diesel');
  expect(cardTitles(root)).toEqual(['Tata Ace']);
  expect(filterPill(root, 'Fuel Type').props.accessibilityLabel).toBe('Fuel Type: Diesel');
});

test('Quick filters: none at first; several at once; a new choice replaces; All clears', async () => {
  const api = require('../src/api/services/vehicle.api');
  const spy = jest.spyOn(api, 'getMarketplaceVehicles');
  const root = await renderHome();
  const lastFilters = () => spy.mock.calls[spy.mock.calls.length - 1][0].filters;

  // Nothing chosen: every vehicle, no filters sent.
  expect(lastFilters()).toEqual({});

  // Different filters combine; the price range becomes price_min / price_max (rupees).
  await pickLocation(root, 'Maharashtra', 'PCMC');
  await pickFilter(root, 'Fuel Type', 'Diesel');
  await pickFilter(root, 'Price Range', '₹5 - 10 lakh');
  expect(lastFilters()).toEqual({ city: 'PCMC', fuel: 'DIESEL', price_min: 500000, price_max: 1000000 });
  expect(filterPill(root, 'Location').props.accessibilityLabel).toBe('Location: PCMC');

  // Another choice in the same filter replaces it; open-ended ranges send one bound.
  // (With a city chosen, Location opens on Maharashtra's cities.)
  await pickLocation(root, 'Pune');
  await pickFilter(root, 'Price Range', 'Under ₹5 lakh');
  expect(lastFilters()).toEqual({ city: 'PUNE', fuel: 'DIESEL', price_max: 500000 });

  // All clears just that filter.
  await pickFilter(root, 'Fuel Type', 'All');
  await pickFilter(root, 'Grade', 'Grade B & above');
  expect(lastFilters()).toEqual({ city: 'PUNE', price_max: 500000, grade_min: 'B' });
  spy.mockRestore();
});

test('Location: state first; Maharashtra lists Pune and PCMC, other states say coming soon', async () => {
  const root = await renderHome();
  await act(async () => filterPill(root, 'Location').props.onPress());
  expect(sheetRow(root, 'Select your state')).toBeUndefined(); // the title, not a row
  expect(sheetRow(root, 'Gujarat')).toBeTruthy();
  // Full state names, never the raw text keys.
  const texts = root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);
  expect(texts.some(text => text.startsWith('location.'))).toBe(false);
  expect(texts).toContain('Maharashtra');

  // The search box narrows the list (anywhere in the name, any case).
  const searchBox = () => root.findAll(n => n.props.placeholder === 'Search your state' && n.props.onChangeText)[0];
  await act(async () => searchBox().props.onChangeText('pradesh'));
  expect(sheetRow(root, 'Uttar Pradesh')).toBeTruthy();
  expect(sheetRow(root, 'Gujarat')).toBeUndefined();
  await act(async () => searchBox().props.onChangeText('xyz'));
  expect(root.findAll(n => n.props.children === 'No state found. Check the spelling.').length).toBeGreaterThan(0);
  await act(async () => searchBox().props.onChangeText('guj'));

  await act(async () => sheetRow(root, 'Gujarat').props.onPress());
  expect(root.findAll(n => n.props.children === 'Coming soon in Gujarat').length).toBeGreaterThan(0);
  expect(sheetRow(root, 'Pune')).toBeUndefined();

  // Back to the states, then Maharashtra's cities.
  await act(async () => root.findAll(n => n.props.title === 'Choose another state' && n.props.onPress)[0].props.onPress());
  await act(async () => sheetRow(root, 'Maharashtra').props.onPress());
  expect(sheetRow(root, 'Pune')).toBeTruthy();
  expect(sheetRow(root, 'PCMC')).toBeTruthy();
  expect(sheetRow(root, 'All of Maharashtra')).toBeTruthy();
});

test('Make -> Model: models are only the chosen make\'s; Car / Bike narrows makes and follows the tabs', async () => {
  const api = require('../src/api/services/vehicle.api');
  const spy = jest.spyOn(api, 'getMarketplaceVehicles');
  const root = await renderHome();
  const lastCall = () => spy.mock.calls[spy.mock.calls.length - 1][0];

  // Maruti Suzuki: only its models.
  await pickFilter(root, 'Make', 'Maruti Suzuki');
  await act(async () => filterPill(root, 'Model').props.onPress());
  const models = sheetLabels(root);
  expect(models).toContain('Swift');
  expect(models).not.toContain('Creta');
  expect(openSheet(root).props.title).toBe('Model - Maruti Suzuki');
  await act(async () => openSheet(root).props.onClose());

  await pickFilter(root, 'Model', 'Swift');
  expect(lastCall().filters).toMatchObject({ make: 'Maruti Suzuki', model: 'Swift' });

  // Another make drops a model that isn't theirs.
  await pickFilter(root, 'Make', 'Hyundai');
  expect(lastCall().filters).toEqual({ make: 'Hyundai' });

  // Bike: bike makes only; the car make is dropped and the Bikes tab is on.
  await pickFilter(root, 'Car / Bike', 'Bike');
  expect(lastCall()).toMatchObject({ category: 'bikes', filters: {} });
  await act(async () => filterPill(root, 'Make').props.onPress());
  expect(sheetLabels(root)).toContain('Royal Enfield');
  expect(sheetLabels(root)).not.toContain('Maruti Suzuki');
  await act(async () => openSheet(root).props.onClose());

  // The Cars tab sets the Car / Bike filter too.
  await act(async () => tab(root, 'Cars').props.onPress());
  await settle();
  expect(filterPill(root, 'Car / Bike').props.accessibilityLabel).toBe('Car / Bike: Car');
  spy.mockRestore();
});

test('All tab: no matches just says so, without Clear filters', async () => {
  const root = await renderHome();
  await searchFor('Lamborghini');
  await settle();

  expect(cardTitles(root)).toEqual([]);
  expect(root.findAll(n => n.props.title === 'No vehicles found').length).toBeGreaterThan(0);
  expect(root.findAll(n => n.props.title === 'Clear filters')).toHaveLength(0);
});

test('A specific tab with no matches offers Clear filters, which brings the vehicles back', async () => {
  const root = await renderHome();
  await act(async () => tab(root, 'Cars').props.onPress());
  await settle();
  await searchFor('Lamborghini');
  await settle();

  expect(cardTitles(root)).toEqual([]);
  expect(root.findAll(n => n.props.title === 'No vehicles found').length).toBeGreaterThan(0);

  await act(async () => root.findAll(n => n.props.title === 'Clear filters' && n.props.onPress)[0].props.onPress());
  await settle();
  expect(cardTitles(root).length).toBeGreaterThan(0);
});

test('Going back to a tab shows its cards at once - no placeholders, no reload', async () => {
  const api = require('../src/api/services/vehicle.api');
  const spy = jest.spyOn(api, 'getMarketplaceVehicles');
  const root = await renderHome();
  expect(cardTitles(root)).toHaveLength(8);

  await act(async () => tab(root, 'Bikes').props.onPress());
  await settle();
  expect(cardTitles(root)).toEqual(['Yamaha RX 100']);
  const requests = spy.mock.calls.length;

  // Back to All: the 8 cards are there on the very same render.
  await act(async () => tab(root, 'All').props.onPress());
  expect(root.findAllByType(VehicleGridSkeleton)).toHaveLength(0);
  expect(cardTitles(root)).toHaveLength(8);
  await settle();
  expect(spy.mock.calls.length).toBe(requests); // seen < 30 s ago: no new request
  spy.mockRestore();
});

test('After 30 s a revisited tab is re-checked quietly, keeping the cards on screen', async () => {
  const api = require('../src/api/services/vehicle.api');
  const spy = jest.spyOn(api, 'getMarketplaceVehicles');
  const root = await renderHome();
  await act(async () => tab(root, 'Bikes').props.onPress());
  await settle();

  await act(async () => {
    jest.advanceTimersByTime(31000);
  });
  const requests = spy.mock.calls.length;
  await act(async () => tab(root, 'All').props.onPress());
  expect(cardTitles(root)).toHaveLength(8); // cached cards stay while it re-checks
  expect(root.findAllByType(VehicleGridSkeleton)).toHaveLength(0);
  await settle();
  expect(spy.mock.calls.length).toBe(requests + 1);
  expect(cardTitles(root)).toHaveLength(8);
  spy.mockRestore();
});

test('Search shows that it is searching until the results arrive', async () => {
  const root = await renderHome();
  const status = () => root.findAll(n => n.props.children === 'Searching for "hyundai"...').length > 0;
  await searchFor('hyundai');
  expect(status()).toBe(true);
  // Smooth: the cards on screen stay (veiled) until the results arrive - no placeholders.
  await act(async () => {
    jest.advanceTimersByTime(400); // past the typing pause, the request on its way
  });
  expect(root.findAllByType(VehicleGridSkeleton)).toHaveLength(0);
  expect(cardTitles(root)).toHaveLength(8);
  await settle();
  expect(status()).toBe(false);
  expect(cardTitles(root).length).toBeGreaterThan(0);
});

test('Search: the button opens the search screen; a search shows here and the X clears it', async () => {
  const root = await renderHome();
  const field = () => root.findAll(n => n.props.placeholder === 'Search Car' && n.props.onChangeText)[0];
  expect(field()).toBeUndefined();

  const navigation = await searchFor('');
  const button = root.findAll(n => n.props.accessibilityLabel === 'Search vehicles' && n.props.onPress)[0];
  await act(async () => button.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('Search', { vehicle: null });

  await searchFor('Lamborghini');
  await settle();
  expect(field().props.value).toBe('Lamborghini');
  expect(cardTitles(root)).toEqual([]);

  // Deleting every letter keeps the bar open (it doesn't vanish while typing).
  await act(async () => field().props.onChangeText(''));
  expect(field()).toBeDefined();
  await act(async () => field().props.onChangeText('Lamborghini'));
  await settle();

  const close = root.findAll(n => n.props.accessibilityLabel === 'Close search' && n.props.onPress)[0];
  await act(async () => close.props.onPress());
  await settle();
  expect(field()).toBeUndefined();
  expect(cardTitles(root)).toHaveLength(8);
});

test('Bike: the other filters fit bikes - bike fuels and prices, no Body Type / Transmission', async () => {
  const api = require('../src/api/services/vehicle.api');
  const spy = jest.spyOn(api, 'getMarketplaceVehicles');
  const root = await renderHome();
  const lastCall = () => spy.mock.calls[spy.mock.calls.length - 1][0];
  const options = async name => {
    await act(async () => filterPill(root, name).props.onPress());
    const labels = sheetLabels(root);
    await act(async () => openSheet(root).props.onClose());
    return labels;
  };

  // Car choices that don't fit a bike are dropped when Bike is picked.
  await pickFilter(root, 'Fuel Type', 'Diesel');
  await pickFilter(root, 'Price Range', '₹5 - 10 lakh');
  await pickFilter(root, 'Body Type', 'SUV');
  await pickFilter(root, 'Grade', 'Grade A & above');
  await pickFilter(root, 'Car / Bike', 'Bike');
  expect(lastCall()).toMatchObject({ category: 'bikes', filters: { grade_min: 'A' } });
  expect(lastCall().filters).toEqual({ grade_min: 'A' });

  expect(await options('Fuel Type')).toEqual(['All', 'Petrol', 'Electric']);
  expect(await options('Price Range')).toEqual([
    'All', 'Under ₹50,000', '₹50,000 - 1 lakh', '₹1 - 2 lakh', '₹2 - 3 lakh', '₹3 lakh +',
  ]);
  expect(filterPill(root, 'Body Type')).toBeUndefined();
  expect(filterPill(root, 'Transmission')).toBeUndefined();

  // A bike budget is sent in rupees; back to Car brings the car filters back.
  await pickFilter(root, 'Price Range', '₹50,000 - 1 lakh');
  expect(lastCall().filters).toMatchObject({ price_min: 50000, price_max: 100000 });
  await pickFilter(root, 'Car / Bike', 'Car');
  expect(filterPill(root, 'Body Type')).toBeTruthy();
  expect(lastCall().filters.price_min).toBeUndefined(); // a bike budget doesn't fit a car
  spy.mockRestore();
});

test('Quick filters: Location, Price, Car / Bike, Make, Model first, on one line that scrolls sideways', async () => {
  const root = await renderHome();
  const names = ['Location', 'Price Range', 'Car / Bike', 'Make', 'Model', 'Fuel Type', 'Body Type', 'Transmission', 'Grade'];
  const shown = root
    .findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && names.includes(n.props.accessibilityLabel))
    .map(n => n.props.accessibilityLabel)
    .filter((name, i, all) => all.indexOf(name) === i);
  expect(shown).toEqual(names);
  const { ScrollView } = require('react-native');
  expect(root.findAllByType(ScrollView).filter(v => v.props.horizontal)).toHaveLength(1);
});
