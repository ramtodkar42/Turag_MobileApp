/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Saved from '../src/screens/saved/Saved/Saved';
import { FavoriteButton, SearchBar, VehicleGridCard } from '../src/components';
import { clearSaved, toggleSaved } from '../src/store/savedStore';
import { addRecentSearch, clearRecentSearches } from '../src/store/recentSearchStore';
import { filterSaved, parseSavedQuery } from '../src/screens/saved/Saved/savedSearch';
import { clearUser, setUser } from '../src/store/userStore';

// These tests render Saved on its own (no navigator); tab focus is covered in tabs.test.jsx.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const swift = { id: 'v2', name: 'Maruti Suzuki Swift', year: 2019, fuel: 'Petrol', price: 228000 };
const i20 = { id: 'v4', name: 'Hyundai i20', year: 2021, fuel: 'Petrol', price: 365000 };
const more = [
  { id: 'v5', name: 'Tata Nexon', year: 2022, fuel: 'Diesel', city: 'Pune', price: 820000 },
  { id: 'v6', name: 'Honda City', year: 2018, fuel: 'Petrol', city: 'Mumbai', price: 540000 },
  { id: 'v7', name: 'Kia Seltos', year: 2020, fuel: 'Diesel', city: 'Mumbai', price: 1050000 },
  { id: 'v8', name: 'Maruti Suzuki Baleno', year: 2021, fuel: 'Petrol', city: 'Pune', price: 610000 },
];

let tree;

const render = async () => {
  const navigation = { navigate: jest.fn() };
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Saved navigation={navigation} />
      </SafeAreaProvider>,
    );
  });
  return { root: tree.root, navigation };
};

// VehicleGridCard is memo()-wrapped, so match on its `vehicle` prop.
const savedNames = root =>
  [...new Set(root.findAll(n => n.props.vehicle?.name && n.props.width).map(n => n.props.vehicle.name))];

// Signed in (a guest gets the login prompts instead - see guest.test.jsx).
beforeEach(() => setUser({ fullName: 'Test User', role: 'individual' }));
afterEach(() => clearUser());

beforeEach(() => {
  jest.useFakeTimers();
  act(() => {
    clearSaved();
    clearRecentSearches();
  });
});

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('Shows an empty state before anything is saved', async () => {
  const { root } = await render();
  expect(savedNames(root)).toEqual([]);
  expect(root.findAll(n => n.props.title === 'No saved vehicles yet').length).toBeGreaterThan(0);
});

test('Hearted vehicles appear newest first; un-hearting removes them', async () => {
  await act(async () => {
    toggleSaved(swift);
    toggleSaved(i20);
  });
  const { root } = await render();
  expect(savedNames(root)).toEqual(['Hyundai i20', 'Maruti Suzuki Swift']);

  const heart = root.findAllByType(FavoriteButton).find(b => b.props.active);
  // Don't await: the save request resolves on a (fake) timer.
  await act(async () => {
    heart.props.onPress();
  });
  expect(savedNames(root)).toEqual(['Maruti Suzuki Swift']);
});

test('Search filters only the saved list, as you type (name, fuel, place, year, price)', async () => {
  await act(async () => [swift, i20, ...more].forEach(v => toggleSaved(v)));
  const { root } = await render();
  const bar = () => root.findByType(SearchBar);
  expect(bar().props.placeholder).toBe('Search your saved vehicles');
  await act(async () => bar().props.onChangeText('swift'));
  expect(savedNames(root)).toEqual(['Maruti Suzuki Swift']);
  await act(async () => bar().props.onChangeText('diesel mumbai'));
  expect(savedNames(root)).toEqual(['Kia Seltos']);
  await act(async () => bar().props.onChangeText('maruti under 5 lakh'));
  expect(savedNames(root)).toEqual(['Maruti Suzuki Swift']);
  await act(async () => bar().props.onChangeText('ferrari'));
  expect(savedNames(root)).toEqual([]);
  expect(root.findAll(n => n.props.message === 'No saved vehicles match “ferrari”.').length).toBeGreaterThan(0);
  // The cross clears it.
  const clear = root.find(n => n.props.accessibilityLabel === 'Clear the search' && n.props.onPress);
  await act(async () => clear.props.onPress());
  expect(savedNames(root)).toHaveLength(6);
});

test('A short saved list has no search box, and no recent searches (those are on Home)', async () => {
  act(() => addRecentSearch({ query: 'Honda CRV' }));
  await act(async () => [swift, i20].forEach(v => toggleSaved(v)));
  const { root } = await render();
  expect(root.findAllByType(SearchBar)).toHaveLength(0);
  expect(root.findAll(n => n.props.children === 'Honda CRV')).toHaveLength(0);
  expect(root.findAll(n => n.props.actionLabel === 'Clear all')).toHaveLength(0);
});

test('savedSearch reads prices in lakh', () => {
  expect(parseSavedQuery('under 5 lakh swift')).toEqual({ words: ['swift'], maxPrice: 500000 });
  expect(parseSavedQuery('5.5L')).toEqual({ words: [], maxPrice: 550000 });
  expect(parseSavedQuery('2019')).toEqual({ words: ['2019'], maxPrice: null });
  expect(filterSaved([swift, i20], '')).toEqual([swift, i20]);
  expect(filterSaved([swift, i20], '2021')).toEqual([i20]);
});

test('VehicleGridCard heart is shared with the saved list', async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(<VehicleGridCard vehicle={swift} width={160} />);
  });
  const heart = () => tree.root.findByType(FavoriteButton);
  expect(heart().props.active).toBe(false);
  await act(async () => {
    heart().props.onPress();
  });
  expect(heart().props.active).toBe(true);
});
