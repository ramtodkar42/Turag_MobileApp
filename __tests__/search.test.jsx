/**
 * The search screen opened from Home's search button: recent searches, price
 * ranges, popular brands (logos), suggestions while typing - every choice goes
 * back to Home with it applied.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Search from '../src/screens/search/Search/Search';
import { brandFits, popularBrands, suggestionsFor } from '../src/screens/search/brands';
import { addRecentSearch, clearRecentSearches } from '../src/store/recentSearchStore';
import ConfirmDialog from '../src/components/feedback/ConfirmDialog';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const nav = () => ({ popTo: jest.fn(), goBack: jest.fn(), navigate: jest.fn() });
const render = async (navigation, params = {}) => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Search navigation={navigation} route={{ params }} />
      </SafeAreaProvider>,
    );
  });
  return tree.root;
};
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const pressable = (root, label) => root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress)[0];
const input = root => root.findAll(n => n.props.placeholder === 'Search by brand or model' && n.props.onChangeText)[0];
const homeParams = navigation => navigation.popTo.mock.calls[0][1].params;

beforeEach(() => clearRecentSearches());
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
});

test('popular brands: the same nine on every tab, cars and bikes mixed, all with logos, no TVS', () => {
  const brands = popularBrands();
  expect(brands.map(b => b.name)).toEqual([
    'Maruti Suzuki',
    'Hyundai',
    'Tata',
    'Mahindra',
    'Toyota',
    'Honda',
    'Royal Enfield',
    'Bajaj',
    'Hero',
  ]);
  expect(brands.every(b => b.logo)).toBe(true);
  expect(brandFits('Hyundai', 'bikes')).toBe(false);
  expect(brandFits('Honda', 'bikes')).toBe(true);
  expect(brandFits('Bajaj', null)).toBe(true);
});

test('a car brand picked while Home is on Bikes is shown on All', async () => {
  const navigation = nav();
  const root = await render(navigation, { vehicle: 'bikes' });
  await act(async () => root.findAll(n => n.props.brand?.name === 'Hyundai')[0].props.onPress('Hyundai'));
  expect(homeParams(navigation).filter).toEqual({ id: 'make', value: 'Hyundai', category: 'all' });
});

test('suggestions match every word: brands first, then "brand model"', () => {
  expect(suggestionsFor('hyun', 'cars')[0]).toMatchObject({ kind: 'brand', label: 'Hyundai' });
  expect(suggestionsFor('maruti swift', 'cars').map(s => s.label)).toEqual(['Maruti Suzuki Swift']);
  expect(suggestionsFor('pulsar', 'cars')).toEqual([]); // a bike, on Cars
  expect(suggestionsFor('pulsar', null).map(s => s.label)).toEqual(['Bajaj Pulsar']);
});

test('the typed letters are marked in the suggestions (any case)', () => {
  const { splitMatches } = require('../src/screens/search/Search/components/HighlightText');
  expect(splitMatches('Hyundai Creta', 'cre')).toEqual([
    { part: 'Hyundai ', match: false },
    { part: 'Cre', match: true },
    { part: 'ta', match: false },
  ]);
  expect(splitMatches('Maruti Suzuki Swift', 'maruti sw')).toEqual([
    { part: 'Maruti', match: true },
    { part: ' Suzuki ', match: false },
    { part: 'Sw', match: true },
    { part: 'ift', match: false },
  ]);
  expect(splitMatches('Grand i10 Nios', 'i10+')).toEqual([{ part: 'Grand i10 Nios', match: false }]);
});

test('typing shows the letters in red inside each suggestion', async () => {
  const root = await render(nav(), { vehicle: 'cars' });
  await act(async () => input(root).props.onChangeText('cre'));
  const red = root.findAll(n => n.props.color === '#E82127' && n.props.children === 'Cre');
  expect(red.length).toBeGreaterThan(0);
});

test('nothing typed: recent searches, price ranges and popular brands', async () => {
  addRecentSearch({ query: 'Tata cars' });
  const root = await render(nav(), { vehicle: 'cars' });
  expect(hasText(root, 'Recent searches')).toBe(true);
  expect(hasText(root, 'Tata cars')).toBe(true);
  expect(hasText(root, 'Price range')).toBe(true);
  expect(hasText(root, 'Under ₹5 lakh')).toBe(true);
  expect(hasText(root, 'Popular brands')).toBe(true);
  expect(pressable(root, 'Maruti Suzuki')).toBeDefined();
  expect(input(root).props.autoFocus).toBe(true);
});

test('nothing searched yet: no Recent searches card; 9 brands', async () => {
  const root = await render(nav());
  expect(hasText(root, 'Recent searches')).toBe(false);
  const BrandTile = require('../src/screens/search/Search/components/BrandTile').default;
  expect(root.findAll(n => n.type === BrandTile.type || n.type === BrandTile)).toHaveLength(9);
});

test('a picked brand / price is remembered and re-applies the same filter', async () => {
  let navigation = nav();
  let root = await render(navigation, { vehicle: 'cars' });
  await act(async () => input(root).props.onChangeText('tata'));
  // The "Tata" brand suggestion.
  const tata = root.findAll(n => n.props.accessibilityLabel === 'Tata' && n.props.onPress)[0];
  await act(async () => tata.props.onPress());
  expect(homeParams(navigation).filter).toEqual({ id: 'make', value: 'Tata' });
  act(() => tree.unmount());

  // Back on the search screen: it's in Recent searches; tapping it applies it again.
  navigation = nav();
  root = await render(navigation, { vehicle: 'cars' });
  expect(hasText(root, 'Recent searches')).toBe(true);
  await act(async () => pressable(root, 'Search Tata').props.onPress());
  expect(homeParams(navigation).filter).toEqual({ id: 'make', value: 'Tata' });
});

test('a brand goes back to Home as the Make filter; a price as the Price filter', async () => {
  let navigation = nav();
  let root = await render(navigation, { vehicle: 'cars' });
  await act(async () => pressable(root, 'Hyundai').props.onPress());
  expect(navigation.popTo).toHaveBeenCalledWith('MainTabs', expect.objectContaining({ screen: 'Market' }), { merge: true });
  expect(homeParams(navigation).filter).toEqual({ id: 'make', value: 'Hyundai' });
  act(() => tree.unmount());

  navigation = nav();
  root = await render(navigation, { vehicle: 'bikes' });
  expect(hasText(root, 'Under ₹50,000')).toBe(true); // bike budgets on Bikes
  const chip = root.findAll(n => n.props.onPress && n.findAll(c => c.props.children === 'Under ₹50,000').length)[0];
  await act(async () => chip.props.onPress());
  expect(homeParams(navigation).filter).toEqual({ id: 'price', value: '0-50000' });
});

test('typing: suggestions; the typed words search and are remembered', async () => {
  const navigation = nav();
  const root = await render(navigation, { vehicle: 'cars' });
  await act(async () => input(root).props.onChangeText('creta'));
  // (The text is split into red / normal pieces: found by the row's label.)
  expect(pressable(root, 'Search for "creta"')).toBeDefined();
  expect(pressable(root, 'Hyundai Creta')).toBeDefined();
  expect(hasText(root, 'Popular brands')).toBe(false);

  await act(async () => input(root).props.onSubmitEditing());
  expect(homeParams(navigation)).toMatchObject({ query: 'creta' });

  // Back on the search screen later: it's in Recent searches.
  act(() => tree.unmount());
  const again = await render(nav());
  expect(hasText(again, 'creta')).toBe(true);
});

test('a recent search runs again; its arrow puts it back in the box; the bin clears them', async () => {
  addRecentSearch({ query: 'Tata cars' });
  const navigation = nav();
  const root = await render(navigation);
  await act(async () => pressable(root, 'Edit "Tata cars"').props.onPress());
  expect(input(root).props.value).toBe('Tata cars');
  await act(async () => input(root).props.onChangeText(''));

  await act(async () => pressable(root, 'Clear recent searches').props.onPress());
  const dialog = root.findByType(ConfirmDialog);
  expect(dialog.props.confirmLabel).toBe('Clear'); // short, on the button
  await act(async () => dialog.props.onConfirm());
  expect(hasText(root, 'Tata cars')).toBe(false);
  expect(hasText(root, 'Recent searches')).toBe(false);
  expect(navigation.popTo).not.toHaveBeenCalled();
});
