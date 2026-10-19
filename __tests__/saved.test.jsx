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
import { ROUTES } from '../src/navigation/routes';

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

// RecentSearchItem is memo()-wrapped, so match on its `item` prop.
const recentItems = root => {
  const seen = new Map();
  root.findAll(n => n.props.item?.query && n.props.onPress).forEach(n => {
    if (!seen.has(n.props.item.query)) {
      seen.set(n.props.item.query, n);
    }
  });
  return [...seen.values()];
};

// VehicleGridCard is memo()-wrapped, so match on its `vehicle` prop.
const savedNames = root =>
  [...new Set(root.findAll(n => n.props.vehicle?.name && n.props.width).map(n => n.props.vehicle.name))];

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

test('Search filters the saved list', async () => {
  await act(async () => {
    toggleSaved(swift);
    toggleSaved(i20);
  });
  const { root } = await render();
  await act(async () => root.findByType(SearchBar).props.onChangeText('swift'));
  expect(savedNames(root)).toEqual(['Maruti Suzuki Swift']);
});

test('Recent searches show, open Home with the search, and clear', async () => {
  act(() => {
    addRecentSearch({ query: 'Honda CRV' });
    addRecentSearch({ query: 'Superb' });
  });
  const { root, navigation } = await render();

  const items = recentItems(root).map(i => i.props.item.query);
  expect(items).toEqual(['Superb', 'Honda CRV']);

  await act(async () => recentItems(root)[1].props.onPress('Honda CRV'));
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MARKET, { query: 'Honda CRV' });

  const clear = root.find(n => n.props.actionLabel === 'Clear all');
  await act(async () => clear.props.onAction());
  expect(recentItems(root)).toHaveLength(0);
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
