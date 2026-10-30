/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import ValuationResult from '../src/screens/valuation/ValuationResult/ValuationResult';
import GarageVehicle from '../src/screens/garage/GarageVehicle/GarageVehicle';
import Garage from '../src/screens/garage/Garage/Garage';
import GarageCard from '../src/screens/garage/Garage/components/GarageCard';
import { Button, KeyValueRow, SuccessSheet, VehicleGridSkeleton } from '../src/components';
import { clearGarage, saveToGarage } from '../src/store/garageStore';
import { ROUTES } from '../src/navigation/routes';
import { sampleValuation, sampleVehicle } from '../src/api/mock/valuation';

// The Garage tab reloads on focus; here, once after mounting.
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

const vehicle = { ...sampleVehicle, vehicleId: 'veh_mock_1', registrationNumber: 'MH12DX5087' };
const valuation = sampleValuation;

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

beforeEach(() => {
  jest.useFakeTimers();
  act(() => clearGarage());
});

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
  launchImageLibrary.mockReset();
  launchImageLibrary.mockResolvedValue({ didCancel: true });
});

test('Camera: shutter checks the angle, shows Perfect Angle, returns the photo', async () => {
  const VehicleCamera = require('../src/screens/valuation/VehicleCamera/VehicleCamera').default;
  const AngleBadge =
    require('../src/screens/valuation/VehicleCamera/components/AngleBadge').default;
  const CameraControls =
    require('../src/screens/valuation/VehicleCamera/components/CameraControls').default;
  const { useCameraDevice } = require('react-native-vision-camera');
  useCameraDevice.mockReturnValue({ minZoom: 1, maxZoom: 8, hasTorch: true });

  const navigation = { goBack: jest.fn(), popTo: jest.fn() };
  const shot = { key: 'front', title: 'Front 0°' };
  const { NavigationContainer } = require('@react-navigation/native');
  const root = await render(
    <NavigationContainer>
      <VehicleCamera
        navigation={navigation}
        route={{ params: { shot, returnTo: ROUTES.SELF_INSPECTION } }}
      />
    </NavigationContainer>,
  );

  expect(root.findByType(AngleBadge).props.title).toBe('Front 0°');
  await act(async () => {
    root.findByType(CameraControls).props.onCapture();
  });
  expect(['capturing', 'checking']).toContain(root.findByType(AngleBadge).props.status);

  await advance(1000);
  expect(root.findByType(AngleBadge).props.status).toBe('perfect');
  await advance(900);
  expect(navigation.popTo).toHaveBeenCalledWith(
    ROUTES.SELF_INSPECTION,
    { captured: { key: 'front', file: expect.objectContaining({ uri: 'file:///tmp/photo.jpg' }) } },
    { merge: true },
  );
  useCameraDevice.mockReturnValue(undefined);
});

test('Valuation result: "sent for review" for 2 s, then Save Vehicle adds it to the Garage', async () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
  const root = await render(
    <ValuationResult
      navigation={navigation}
      route={{ params: { vehicle, valuation, inspected: true } }}
    />,
  );

  expect(root.findByType(SuccessSheet).props.visible).toBe(true);
  await advance(2100);
  expect(root.findByType(SuccessSheet).props.visible).toBe(false);
  expect(root.findAllByType(KeyValueRow).map(r => r.props.label)).toEqual([
    'Distress',
    'Auction',
    'Trade-In',
    'Retail',
  ]);

  await act(async () => {
    button(root, 'Save Vehicle').props.onPress();
  });
  await advance(700);
  expect(navigation.reset).toHaveBeenCalledWith({
    index: 1,
    routes: [
      { name: ROUTES.MAIN_TABS, params: { screen: ROUTES.GARAGE } },
      {
        name: ROUTES.GARAGE_VEHICLE,
        params: { vehicle: expect.objectContaining({ status: 'in_review', estimatedValue: 831300 }) },
      },
    ],
  });
});

test('Valuation result without an inspection or estimate: no success sheet, "Not available yet"', async () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
  const root = await render(
    <ValuationResult navigation={navigation} route={{ params: { vehicle, valuation: null } }} />,
  );
  expect(root.findByType(SuccessSheet).props.visible).toBe(false);
  expect(root.findAll(n => n.props.value === 'Not available yet').length).toBeGreaterThan(0);
  expect(root.findAllByType(KeyValueRow)).toHaveLength(0);
});

test('Garage vehicle page: details; not inspected yet - self-inspect (after consent) or book an inspector', async () => {
  const saved = {
    ...vehicle,
    valuationId: 'val_mock_1',
    estimatedValue: 831300,
    savedOn: '2026-09-20',
    phase: 'fresh',
  };
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const root = await render(<GarageVehicle navigation={navigation} route={{ params: { vehicle: saved } }} />);

  expect(root.findAllByType(KeyValueRow).map(r => [r.props.label, r.props.value])).toEqual([
    ['Category', expect.any(String)],
    ['Fuel type', 'Petrol'],
    ['Mfg. Year', 2024],
    ['Previous Owner', 1],
    ['Saved on', '20 Sep 2026'],
  ]);

  // ADR-0038: not listable before a finished inspection.
  expect(button(root, 'Create Listing')).toBeUndefined();
  expect(button(root, 'Self-inspect now').props.disabled).toBe(true); // consent first
  await act(async () => button(root, 'Book an Inspector').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(
    ROUTES.BOOK_APPOINTMENT,
    expect.objectContaining({ vehicle: expect.objectContaining({ vehicleId: expect.any(String) }) }),
  );
});

test('Garage vehicle page: inspected + valued - Create Listing; listed - View listing; no value - Book', async () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const ready = { ...vehicle, valuationId: 'val_1', phase: 'can_list', inspectionEligible: true };
  let root = await render(<GarageVehicle navigation={navigation} route={{ params: { vehicle: ready } }} />);
  await act(async () => button(root, 'Create Listing').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.CREATE_LISTING, { vehicle: ready });
  act(() => tree.unmount());

  // Inspected but no estimate yet: can't list - book an inspector.
  const noValue = { ...vehicle, valuationId: null, phase: 'can_list', inspectionEligible: true };
  root = await render(<GarageVehicle navigation={navigation} route={{ params: { vehicle: noValue } }} />);
  expect(button(root, 'Create Listing')).toBeUndefined();
  expect(button(root, 'Book an Inspector')).toBeDefined();
  act(() => tree.unmount());

  const listed = { ...vehicle, valuationId: 'val_1', listingId: 'lst_1', listingStatus: 'LIVE', phase: 'listed' };
  root = await render(<GarageVehicle navigation={navigation} route={{ params: { vehicle: listed } }} />);
  await act(async () => button(root, 'View listing').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MY_LISTING, { listingId: 'lst_1' });
});

test('Garage tab: placeholders, empty state, then saved vehicles with their status badge', async () => {
  const navigation = { navigate: jest.fn() };
  let root = await render(<Garage navigation={navigation} />);
  expect(root.findAllByType(VehicleGridSkeleton)).toHaveLength(1);
  await advance(400);
  expect(root.findAll(n => n.props.title === 'Your garage is empty').length).toBeGreaterThan(0);
  act(() => tree.unmount());

  await act(async () => {
    saveToGarage({ vehicle: { ...vehicle, registrationNumber: 'MH14AB1111' }, valuation: null });
    saveToGarage({ vehicle, valuation, inspected: true });
  });
  await advance(700);
  root = await render(<Garage navigation={navigation} />);
  await advance(400);

  // GarageCard is memo()-wrapped, so match on its `vehicle` prop.
  const cards = root.findAll(n => n.props.vehicle && n.props.onAction && n.type !== GarageCard);
  expect(cards.map(c => c.props.vehicle.status).sort()).toEqual(['in_review', 'not_inspected']);
  const badge = label => root.findAll(n => n.props.label === label && n.props.tone)[0];
  // The web's stage chip (short, one line on the card): what's happening.
  expect(badge('In progress').props.tone).toBe('warningOnPhoto'); // white pill, orange text
  expect(badge('Not inspected').props.tone).toBe('neutralOnPhoto');
  expect(root.findAll(n => n.props.children === 'Not available').length).toBeGreaterThan(0);

  const card = cards.find(c => c.props.vehicle.status === 'in_review');
  await act(async () => card.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(
    ROUTES.GARAGE_VEHICLE,
    expect.objectContaining({ vehicle: expect.objectContaining({ make: 'KIA' }) }),
  );
});

test('Garage card actions (as the web): one next step per stage', async () => {
  const onAction = jest.fn();
  const actionOf = async v => {
    const root = await render(<GarageCard vehicle={v} width={180} onPress={jest.fn()} onAction={onAction} />);
    const b = root.findAllByType(Button)[0];
    const title = b.props.title;
    await act(async () => b.props.onPress());
    act(() => tree.unmount());
    return [title, onAction.mock.calls.at(-1)[0]];
  };

  // Not inspected yet (valued or not): inspect first (ADR-0038).
  expect(await actionOf({ ...vehicle, valuationId: 'val_1', phase: 'fresh' })).toEqual(['Inspect to list', 'inspect']);
  // Inspected and valued: list it.
  expect(await actionOf({ ...vehicle, valuationId: 'val_1', phase: 'can_list', inspectionEligible: true })).toEqual([
    'List this vehicle',
    'list',
  ]);
  // Inspected, no estimate yet: book an inspection.
  expect(await actionOf({ ...vehicle, valuationId: null, phase: 'can_list', inspectionEligible: true })).toEqual([
    'Book an inspection',
    'book',
  ]);
  // Listed: open it.
  expect(await actionOf({ ...vehicle, listingId: 'lst_1', listingStatus: 'LIVE', phase: 'listed' })).toEqual([
    'View listing',
    'view',
  ]);
});

test('Camera loader: a missing native library gives "not available" instead of a crash', () => {
  const { loadCameraLibrary, isCameraAvailable } = require('../src/utils/visionCamera');
  // Native part missing: the module comes back empty / undefined, or throws.
  expect(loadCameraLibrary(() => ({}))).toBeNull();
  expect(loadCameraLibrary(() => undefined)).toBeNull();
  expect(
    loadCameraLibrary(() => {
      throw new Error('NitroModules are not available');
    }),
  ).toBeNull();
  // Library present (the Jest mock): usable.
  expect(isCameraAvailable).toBe(true);
});

test('Camera never sends a torch value to a camera without flash (selfie camera)', async () => {
  const VehicleCamera = require('../src/screens/valuation/VehicleCamera/VehicleCamera').default;
  const CameraControls =
    require('../src/screens/valuation/VehicleCamera/components/CameraControls').default;
  const { Camera, useCameraDevice } = require('react-native-vision-camera');
  useCameraDevice.mockImplementation(position =>
    position === 'front'
      ? { minZoom: 1, maxZoom: 4, hasTorch: false, hasFlash: false }
      : { minZoom: 1, maxZoom: 8, hasTorch: true, hasFlash: true },
  );
  const { NavigationContainer } = require('@react-navigation/native');
  const shot = { key: 'front', title: 'Front 0°' };

  const root = await render(
    <NavigationContainer>
      <VehicleCamera
        navigation={{ goBack: jest.fn(), popTo: jest.fn() }}
        route={{ params: { shot, returnTo: ROUTES.SELF_INSPECTION } }}
      />
    </NavigationContainer>,
  );
  const camera = () => root.findByType(Camera);

  await act(async () => camera().props.onStarted());
  expect(camera().props.torchMode).toBe('off'); // back camera has a torch

  await act(async () => root.findByType(CameraControls).props.onFlip());
  await act(async () => camera().props.onStarted());
  expect(camera().props.torchMode).toBeUndefined(); // front camera: no flash unit

  useCameraDevice.mockReset();
  useCameraDevice.mockReturnValue(undefined);
});

test('Camera hides the harmless "Camera is not active" error but shows real ones', async () => {
  const VehicleCamera = require('../src/screens/valuation/VehicleCamera/VehicleCamera').default;
  const { Camera, useCameraDevice } = require('react-native-vision-camera');
  useCameraDevice.mockReturnValue({ minZoom: 1, maxZoom: 8, hasTorch: true });
  const { NavigationContainer } = require('@react-navigation/native');
  const shot = { key: 'front', title: 'Front 0°' };

  const root = await render(
    <NavigationContainer>
      <VehicleCamera
        navigation={{ goBack: jest.fn(), popTo: jest.fn() }}
        route={{ params: { shot, returnTo: ROUTES.SELF_INSPECTION } }}
      />
    </NavigationContainer>,
  );
  const camera = () => root.findByType(Camera);
  const texts = () => root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children);

  await act(async () =>
    camera().props.onError(
      new Error('androidx.camera.core.CameraControl$OperationCanceledException: Camera is not active.'),
    ),
  );
  expect(texts().some(t => /not active/.test(t))).toBe(false);

  await act(async () => camera().props.onError(new Error('Camera device disconnected')));
  expect(texts()).toContain('Camera device disconnected');
  useCameraDevice.mockReturnValue(undefined);
});
