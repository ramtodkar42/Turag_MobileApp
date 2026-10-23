/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import VehicleListing from '../src/screens/marketplace/VehicleListing/VehicleListing';
import MakeOffer from '../src/screens/marketplace/MakeOffer/MakeOffer';
import {
  Button,
  SuccessSheet,
  TextField,
} from '../src/components';
import { clearSaved, isSaved } from '../src/store/savedStore';
import { getVehicleDetails } from '../src/api/services/vehicle.api';
import { clearUser, setUser } from '../src/store/userStore';
import { ROUTES } from '../src/navigation/routes';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// v1 = KIA Seltos in the sample marketplace data.
const card = { id: 'v1', name: 'KIA Seltos', year: 2023, fuel: 'Petrol', price: 880000 };

let tree;

const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};

const advance = async ms => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

const button = (root, title) => root.findAllByType(Button).find(b => b.props.title === title);
const hasText = (root, text) =>
  root.findAll(n => typeof n.type === 'string' && [].concat(n.props.children).join('') === text).length > 0;

// Signed in (a guest gets the login prompts instead - see guest.test.jsx).
beforeEach(() => setUser({ fullName: 'Test User', role: 'individual' }));
afterEach(() => clearUser());

beforeEach(() => {
  jest.useFakeTimers();
  act(() => clearSaved());
});

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('Vehicle page shows details, bookmark saves it, Make an offer opens the offer screen', async () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const root = await render(
    <VehicleListing navigation={navigation} route={{ params: { vehicle: card } }} />,
  );
  await advance(400);

  // Name, then year • fuel, then where it is; the details as tiles; the inspection banner.
  expect(hasText(root, 'KIA Seltos')).toBe(true);
  expect(hasText(root, '2023 • Petrol')).toBe(true);
  expect(hasText(root, 'Pune')).toBe(true);
  const tiles = root.findAll(n => n.type?.name === 'SpecGrid')[0].props.rows.map(r => [r.label, r.value]);
  expect(tiles).toEqual([
    ['Vehicle type', 'Four Wheeler'],
    ['Fuel type', 'Petrol'],
    ['Registration year', 2023],
  ]);
  const banner = root.findAll(n => n.type?.name === 'InspectionBanner')[0];
  expect(banner.props).toMatchObject({ label: 'TURAG Verified', verified: true });
  expect(hasText(root, 'Price & valuation')).toBe(true);

  // The bookmark on the photo saves it.
  const bookmark = root.findAll(n => n.props.accessibilityLabel === 'Save vehicle' && n.props.onPress)[0];
  await act(async () => {
    bookmark.props.onPress();
  });
  expect(isSaved('v1')).toBe(true);
  expect(root.findAll(n => n.props.accessibilityLabel === 'Remove from saved' && n.props.onPress).length).toBeGreaterThan(0);

  // Back on the photo.
  await act(async () => root.findAll(n => n.props.accessibilityLabel === 'Go back' && n.props.onPress)[0].props.onPress());
  expect(navigation.goBack).toHaveBeenCalled();

  await act(async () => button(root, 'Make an offer').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(
    ROUTES.MAKE_OFFER,
    expect.objectContaining({ vehicle: expect.objectContaining({ id: 'v1' }) }),
  );
});

test('Make an offer: price is formatted, Submit enables, success sheet returns home after the delay', async () => {
  const details = getVehicleDetails('v1');
  await advance(400);
  const vehicle = await details;
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const root = await render(<MakeOffer navigation={navigation} route={{ params: { vehicle } }} />);

  const price = () => root.findAllByType(TextField).find(f => f.props.label === 'Price');
  expect(button(root, 'Submit Offer').props.disabled).toBe(true);

  await act(async () => price().props.onChangeText('825500'));
  expect(price().props.value).toBe('8,25,500');
  expect(button(root, 'Submit Offer').props.disabled).toBe(false);

  await act(async () => {
    button(root, 'Submit Offer').props.onPress();
  });
  await advance(900);
  expect(root.findByType(SuccessSheet).props.visible).toBe(true);

  expect(root.findByType(SuccessSheet).props.actionLabel).toBeUndefined(); // no Done button

  await advance(1400);
  expect(navigation.navigate).not.toHaveBeenCalledWith(ROUTES.MAIN_TABS);
  await advance(200); // SUCCESS_DELAY is 1.5 s
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MAIN_TABS);
});

test('Offer price ignores letters and leading zeros', async () => {
  const root = await render(
    <MakeOffer
      navigation={{ navigate: jest.fn(), goBack: jest.fn() }}
      route={{ params: { vehicle: card } }}
    />,
  );
  const price = () => root.findAllByType(TextField).find(f => f.props.label === 'Price');
  await act(async () => price().props.onChangeText('00a25,500'));
  expect(price().props.value).toBe('25,500');
});
