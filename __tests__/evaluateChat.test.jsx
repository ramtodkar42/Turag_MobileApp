/**
 * The Evaluate tab as a chat with TURAG.ai (mock backend): the same steps as
 * the web's /evaluate - registration number, "Is this your vehicle?", the
 * instant estimate, km / owners / accident, the updated estimate, then
 * Save Vehicle / Inspect Vehicle and Self Inspection / Appoint an Inspector.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EvaluateChat from '../src/screens/valuation/EvaluateChat/EvaluateChat';
import { Keyboard, TextInput } from 'react-native';
import { KeyValueRow, ValueCard } from '../src/components';
import { sampleVehicle } from '../src/api/mock/valuation';
import * as valuationApi from '../src/api/services/valuation.api';
import { clearGarage } from '../src/store/garageStore';
import { ROUTES } from '../src/navigation/routes';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;
const advance = async (ms = 1000) => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
  }
};
const hasText = (root, text) =>
  root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
const button = (root, title) => root.findAll(n => n.props.title === title && n.props.onPress)[0];
const input = root => root.findAllByType(TextInput)[0];
const send = root => root.findAll(n => n.props.accessibilityLabel === 'Send message' && n.props.onPress)[0];

const type = async (root, text) => {
  await act(async () => input(root).props.onChangeText(text));
  await act(async () => send(root).props.onPress());
};

const open = async navigation => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <EvaluateChat navigation={navigation} />
      </SafeAreaProvider>,
    );
  });
  await advance(700);
  return tree.root;
};
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn() });

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => tree?.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Up to the updated estimate.
const toResult = async (root, accident = 'Minor') => {
  await type(root, 'mh12dx5087');
  await advance(1500);
  await act(async () => button(root, 'Yes, it’s mine').props.onPress());
  await advance(2000);
  await type(root, '45000');
  await advance(700);
  await act(async () => button(root, '2').props.onPress());
  await advance(700);
  await act(async () => button(root, accident).props.onPress());
  await advance(1500);
};

test('asks for the registration number; Send only for a valid one', async () => {
  const root = await open(nav());
  expect(hasText(root, 'Let’s find out what your vehicle is worth.')).toBe(true);
  expect(hasText(root, 'What’s your vehicle’s registration number?')).toBe(true);

  await act(async () => input(root).props.onChangeText('mh12'));
  expect(input(root).props.value).toBe('MH12');
  expect(send(root)).toBeUndefined();
  await act(async () => input(root).props.onChangeText('mh12dx5087'));
  expect(send(root)).toBeDefined();
});

test('the whole conversation, the same calls as the web, then Self Inspection', async () => {
  const propose = jest.spyOn(valuationApi, 'proposeVehicle');
  const confirm = jest.spyOn(valuationApi, 'confirmVehicle');
  const estimate = jest.spyOn(valuationApi, 'estimateValuation');
  const navigation = nav();
  const root = await open(navigation);

  await type(root, 'mh12dx5087');
  expect(hasText(root, 'MH 12 DX 5087')).toBe(true); // the user's answer
  await advance(1500);
  expect(propose).toHaveBeenCalledWith('MH12DX5087');
  expect(hasText(root, 'Is this your vehicle?')).toBe(true);

  await act(async () => button(root, 'Yes, it’s mine').props.onPress());
  await advance(2000);
  expect(confirm).toHaveBeenCalledWith('MH12DX5087');
  expect(estimate).toHaveBeenCalledWith({ vehicleId: 'veh_mock_1', stage: 'INSTANT' });
  expect(root.findAllByType(ValueCard)[0].props.value).toBe('₹8,31,300/-');
  expect(hasText(root, 'How many km has it done?')).toBe(true);

  await type(root, '45000');
  expect(hasText(root, '45,000 km')).toBe(true);
  await advance(700);
  await act(async () => button(root, '2').props.onPress());
  expect(hasText(root, '2 owners')).toBe(true);
  await advance(700);
  expect(button(root, 'No')).toBeDefined();
  await act(async () => button(root, 'Minor').props.onPress());
  await advance(1500);
  expect(estimate).toHaveBeenLastCalledWith({
    vehicleId: 'veh_mock_1',
    stage: 'DECLARED',
    odometerKm: 45000,
    ownerCount: 2,
    condition: 'FAIR',
  });
  // (The list is inverted: the newest card comes first.)
  expect(root.findAllByType(ValueCard)).toHaveLength(2);
  expect(root.findAllByType(ValueCard)[0].props.label).toBe('Updated Estimate');
  expect(button(root, 'Save Vehicle')).toBeDefined();

  await act(async () => button(root, 'Inspect Vehicle').props.onPress());
  await advance(700);
  expect(hasText(root, 'How would you like to verify your vehicle?')).toBe(true);
  await act(async () => button(root, 'Self Inspection').props.onPress());
  await advance(700);
  expect(hasText(root, 'RC, insurance and PUC')).toBe(true); // what it covers
  await act(async () => {
    button(root, 'Start self-inspection').props.onPress();
  });
  await advance(1500);
  // The web's self-inspection process (Photos -> Documents -> Checklist -> Estimate).
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.SELF_INSPECTION, {
    inspectionId: expect.any(String),
    vehicle: expect.objectContaining({ vehicleId: 'veh_mock_1' }),
    valuation: expect.objectContaining({ stage: 'DECLARED' }),
  });
});

test('Not my vehicle asks for the number again; a failed lookup explains and asks again', async () => {
  const root = await open(nav());
  await type(root, 'mh12dx5087');
  await advance(1500);
  await act(async () => button(root, 'Not my vehicle').props.onPress());
  await advance(700);
  expect(hasText(root, 'Please type the correct registration number.')).toBe(true);
  expect(input(root)).toBeDefined();

  jest.spyOn(valuationApi, 'proposeVehicle').mockRejectedValueOnce(new Error('We couldn’t find this vehicle.'));
  await type(root, 'mh12dx5088');
  await advance(1000);
  expect(hasText(root, 'We couldn’t find this vehicle.')).toBe(true);
  expect(hasText(root, 'Please check the number and type it again.')).toBe(true);
  expect(input(root)).toBeDefined();
});

test('Appoint an Inspector opens the booking form; Save Vehicle saves it to the Garage', async () => {
  const navigation = nav();
  const root = await open(navigation);
  await toResult(root);

  await act(async () => {
    button(root, 'Save Vehicle').props.onPress();
  });
  await advance(800);
  expect(button(root, 'View in Garage')).toBeDefined();

  await act(async () => button(root, 'Inspect Vehicle').props.onPress());
  await advance(700);
  await act(async () => button(root, 'Appoint an Inspector').props.onPress());
  await advance(700);
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.BOOK_APPOINTMENT, {
    vehicle: expect.objectContaining({ vehicleId: 'veh_mock_1' }),
    valuation: expect.objectContaining({ stage: 'DECLARED' }),
  });
  act(() => clearGarage());
});

test('the keyboard closes after an answer, so the reply and the choices are in view', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  const root = await open(nav());
  dismiss.mockClear();
  await type(root, 'mh12dx5087');
  expect(dismiss).toHaveBeenCalled();
  await advance(1500);
  // "Is this your vehicle?" is answered with buttons: the keyboard stays closed.
  dismiss.mockClear();
  await act(async () => button(root, 'Yes, it’s mine').props.onPress());
  await advance(2000);
  expect(dismiss).toHaveBeenCalled();
});

test('the vehicle card shows its main details; More details shows the rest', async () => {
  const root = await open(nav());
  await type(root, 'mh12dx5087');
  await advance(1500);
  const rows = () => root.findAllByType(KeyValueRow).length;
  expect(rows()).toBe(4);
  await act(async () => button(root, 'More details').props.onPress());
  expect(rows()).toBeGreaterThan(4);
  expect(button(root, 'Fewer details')).toBeDefined();
});

test('two-wheelers: self-inspection is for cars, so only Appoint an Inspector', async () => {
  jest.spyOn(valuationApi, 'confirmVehicle').mockImplementation(async plate => ({
    ...sampleVehicle,
    category: 'TWO_WHEELER',
    vehicleId: 'veh_bike',
    registrationNumber: plate,
  }));
  const root = await open(nav());
  await toResult(root);
  await act(async () => button(root, 'Inspect Vehicle').props.onPress());
  await advance(700);
  expect(hasText(root, 'available for cars')).toBe(true);
  expect(button(root, 'Self Inspection')).toBeUndefined();
  expect(button(root, 'Appoint an Inspector')).toBeDefined();
});

test('Start over begins a new conversation', async () => {
  const root = await open(nav());
  await type(root, 'mh12dx5087');
  await advance(1500);
  await act(async () => button(root, 'Start over').props.onPress());
  await advance(700);
  expect(hasText(root, 'Is this your vehicle?')).toBe(false);
  expect(hasText(root, 'What’s your vehicle’s registration number?')).toBe(true);
});
