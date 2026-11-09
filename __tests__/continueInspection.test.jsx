/**
 * An AI self-inspection left open is easy to find again: Home's "pick up where you
 * left off" card, the Garage tab's dot, and the app's own top banner; and never a
 * second inspection for the same vehicle (the open one is found first).
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as garageApi from '../src/api/services/garage.api';
import * as garageStore from '../src/store/garageStore';
import { clearUser, setUser } from '../src/store/userStore';
import ContinueInspectionCard from '../src/screens/home/Home/components/ContinueInspectionCard';
import GarageTabDot from '../src/screens/garage/GarageTabDot';
import PushBanner from '../src/push/PushBanner';
import { hideBanner, showBanner } from '../src/push/bannerStore';
import { IconTile } from '../src/components';
import { colors } from '../src/theme';

// The Garage marks what it shows as seen when it comes into view; here, on mount.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  return tree.root;
};
const texts = root =>
  root
    .findAll(n => typeof n.props.children === 'string' || Array.isArray(n.props.children))
    .flatMap(n => [n.props.children].flat())
    .filter(c => typeof c === 'string');
const hasText = (root, text) => texts(root).some(s => s.includes(text));

const car = over => ({
  id: 'g1',
  vehicleId: 'veh_1',
  make: 'Maruti Suzuki',
  model: 'Dzire',
  year: 2019,
  inspectionId: 'ins_1',
  phase: 'resume_self',
  valuationId: null,
  ...over,
});
// The Garage as the server has it.
const garageIs = async items => {
  jest.spyOn(garageApi, 'getGarage').mockResolvedValue(items);
  await act(async () => {
    await garageStore.loadGarage();
  });
};

beforeEach(() => setUser({ fullName: 'Test User', role: 'individual' }));
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  act(() => garageStore.clearGarage());
  act(() => hideBanner());
  clearUser();
  jest.restoreAllMocks();
});

describe('finding a self-inspection still open for a vehicle', () => {
  test('from a fresh Garage: in progress or waiting for its payment counts; anything else does not', async () => {
    const get = jest
      .spyOn(garageApi, 'getGarage')
      .mockResolvedValue([
        car(),
        car({ id: 'g2', vehicleId: 'veh_2', inspectionId: 'ins_2', phase: 'payment_pending' }),
        car({ id: 'g3', vehicleId: 'veh_3', inspectionId: 'ins_3', phase: 'in_review' }),
        car({ id: 'g4', vehicleId: 'veh_4', inspectionId: null, phase: 'fresh' }),
      ]);
    expect(await garageStore.findOpenSelfInspection('veh_1')).toMatchObject({ inspectionId: 'ins_1' });
    expect(get).toHaveBeenCalled();
    expect(await garageStore.findOpenSelfInspection('veh_2')).toMatchObject({ inspectionId: 'ins_2' });
    expect(await garageStore.findOpenSelfInspection('veh_3')).toBeNull();
    expect(await garageStore.findOpenSelfInspection('veh_4')).toBeNull();
    expect(await garageStore.findOpenSelfInspection('veh_9')).toBeNull();
    expect(await garageStore.findOpenSelfInspection(undefined)).toBeNull();
  });

  test('offline: the last copy of the Garage is used, and nothing breaks', async () => {
    await garageIs([car()]);
    jest.spyOn(garageApi, 'getGarage').mockRejectedValue(new Error('offline'));
    expect(await garageStore.findOpenSelfInspection('veh_1')).toMatchObject({ inspectionId: 'ins_1' });
  });
});

describe('Home: pick up where you left off', () => {
  // The whole row is the button (its small "View" just says what a tap does).
  const row = root =>
    root.findAll(n => n.props.accessibilityHint === 'Opens your Garage' && n.props.onPress)[0];

  test('one in progress: the message, a small View and the X - a tap opens the Garage', async () => {
    await garageIs([car(), car({ id: 'g2', vehicleId: 'veh_2', phase: 'in_review', inspectionId: 'ins_2' })]);
    const onOpenGarage = jest.fn();
    const root = await render(<ContinueInspectionCard onOpenGarage={onOpenGarage} />);
    expect(hasText(root, 'AI Self Inspection in progress')).toBe(true);
    expect(hasText(root, 'View')).toBe(true);
    // No vehicle name, no second line: the message alone.
    expect(hasText(root, 'Maruti')).toBe(false);
    expect(hasText(root, '2019')).toBe(false);
    // A light pill, not a filled red button.
    expect(root.findAll(n => typeof n.props.title === 'string' && n.props.onPress)).toHaveLength(0);
    // Never cut short with "...": the message wraps instead (Hindi / Marathi run longer).
    root
      .findAll(n => n.props.children === 'AI Self Inspection in progress')
      .forEach(n => expect(n.props.numberOfLines).toBeUndefined());
    expect(row(root).props.accessibilityLabel).toBe('AI Self Inspection in progress');
    await act(async () => row(root).props.onPress());
    expect(onOpenGarage).toHaveBeenCalledTimes(1);
  });

  test('done but not paid: says it is the payment; a tap opens the Garage', async () => {
    await garageIs([car({ phase: 'payment_pending' })]);
    const onOpenGarage = jest.fn();
    const root = await render(<ContinueInspectionCard onOpenGarage={onOpenGarage} />);
    expect(hasText(root, 'AI Self Inspection payment pending')).toBe(true);
    await act(async () => row(root).props.onPress());
    expect(onOpenGarage).toHaveBeenCalledTimes(1);
  });

  test('more than one: how many; a tap opens the Garage where they all are', async () => {
    await garageIs([car(), car({ id: 'g2', vehicleId: 'veh_2', inspectionId: 'ins_2' })]);
    const onOpenGarage = jest.fn();
    const root = await render(<ContinueInspectionCard onOpenGarage={onOpenGarage} />);
    expect(hasText(root, '2 AI Self Inspections in progress')).toBe(true);
    expect(hasText(root, 'Maruti')).toBe(false);
    await act(async () => row(root).props.onPress());
    expect(onOpenGarage).toHaveBeenCalledTimes(1);
  });

  test('nothing open, or a guest: no row', async () => {
    await garageIs([car({ phase: 'in_review' })]);
    let root = await render(<ContinueInspectionCard onOpenGarage={jest.fn()} />);
    expect(row(root)).toBeUndefined();
    act(() => tree.unmount());

    await garageIs([car()]);
    clearUser();
    root = await render(<ContinueInspectionCard onOpenGarage={jest.fn()} />);
    expect(row(root)).toBeUndefined();
  });

  // Last: hiding it lasts until the app is next opened.
  test('its X puts it away until the app is next opened (without opening anything)', async () => {
    await garageIs([car()]);
    const onOpenGarage = jest.fn();
    const root = await render(<ContinueInspectionCard onOpenGarage={onOpenGarage} />);
    const hide = root.findAll(n => n.props.accessibilityLabel === 'Hide' && n.props.onPress)[0];
    await act(async () => hide.props.onPress());
    expect(row(root)).toBeUndefined();
    expect(onOpenGarage).not.toHaveBeenCalled();
    act(() => tree.unmount());
    const again = await render(<ContinueInspectionCard onOpenGarage={jest.fn()} />);
    expect(row(again)).toBeUndefined();
  });
});

describe('the Garage tab dot', () => {
  const dots = root => root.findAll(n => n.type === 'View' && n.props.importantForAccessibility === 'no');

  test('only until the Garage has shown it: then gone for good; a new open inspection brings it back', async () => {
    await garageIs([car({ phase: 'in_review' })]);
    let root = await render(<GarageTabDot />);
    expect(dots(root)).toHaveLength(0); // nothing open
    act(() => tree.unmount());

    await garageIs([car()]);
    root = await render(<GarageTabDot />);
    expect(dots(root)).toHaveLength(1); // open, not seen in the Garage yet
    await act(async () => garageStore.markOpenInspectionsSeen([car()]));
    expect(dots(root)).toHaveLength(0);
    // The same inspection stays seen, whatever reloads.
    await garageIs([car()]);
    expect(dots(root)).toHaveLength(0);
    // Another open inspection: the dot again, until that one is seen too.
    const second = car({ id: 'g2', vehicleId: 'veh_2', inspectionId: 'ins_2' });
    await garageIs([car(), second]);
    expect(dots(root)).toHaveLength(1);
    await act(async () => garageStore.markOpenInspectionsSeen([car(), second]));
    expect(dots(root)).toHaveLength(0);
  });

  test('opening the Garage is what counts as seeing it', async () => {
    const Garage = require('../src/screens/garage/Garage/Garage').default;
    await garageIs([car()]);
    const dot = await render(<GarageTabDot />);
    expect(dots(dot)).toHaveLength(1);
    const garage = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Garage navigation={{ navigate: jest.fn() }} />
      </SafeAreaProvider>,
    );
    await act(async () => {});
    expect(dots(dot)).toHaveLength(0);
    act(() => garage.unmount());
  });

  test('never for guests', async () => {
    await garageIs([car()]);
    clearUser();
    const root = await render(<GarageTabDot />);
    expect(dots(root)).toHaveLength(0);
  });
});

describe("the app's own top banner", () => {
  test('a green tick, and a tap does what the message offers (not a push link)', async () => {
    const onPress = jest.fn();
    const root = await render(<PushBanner />);
    await act(async () =>
      showBanner({ title: 'Saved in your Garage', body: 'Continue anytime.', icon: 'check', tone: 'success', onPress }),
    );
    const tile = root.findByType(IconTile);
    expect(tile.props).toMatchObject({ name: 'check', color: colors.success, backgroundColor: colors.successLight });
    // Room for longer languages: a two-line title, three lines of text.
    expect(root.findAll(n => n.props.children === 'Saved in your Garage')[0].props.numberOfLines).toBe(2);
    expect(root.findAll(n => n.props.children === 'Continue anytime.')[0].props.numberOfLines).toBe(3);
    await act(async () => root.findAll(n => n.props.accessibilityRole === 'alert' && n.props.onPress)[0].props.onPress());
    expect(onPress).toHaveBeenCalled();
  });

  test('a push keeps its bell', async () => {
    const root = await render(<PushBanner />);
    await act(async () => showBanner({ title: 'Offer received', body: 'A buyer made an offer.', link: '/buy/offers' }));
    expect(root.findByType(IconTile).props.name).toBe('bell');
  });
});
