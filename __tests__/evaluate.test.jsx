/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { formatRegNumber, isValidRegNumber } from '../src/utils/validators';
import { formatDate, formatPriceRange } from '../src/utils/format';
import { ROUTES } from '../src/navigation/routes';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;

const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('Registration number validation and formatting', () => {
  expect(isValidRegNumber('MH12CT4590')).toBe(true);
  expect(isValidRegNumber('mh 12 dx 5087')).toBe(true);
  expect(isValidRegNumber('DL3C1234')).toBe(true);
  expect(isValidRegNumber('MH12')).toBe(false);
  expect(isValidRegNumber('1234ABCD')).toBe(false);
  expect(formatRegNumber('MH12DX5087')).toBe('MH 12 DX 5087');
});

test('Price range and date formatting', () => {
  expect(formatPriceRange({ min: 800000, max: 845000 })).toBe('₹8L to ₹8.45L');
  expect(formatDate('2026-02-07')).toBe('07 Feb 2026');
});

test('Evaluate tab opens the Evaluate chat with TURAG.ai', async () => {
  const { NavigationContainer, createNavigationContainerRef } = require('@react-navigation/native');
  const RootNavigator = require('../src/navigation/RootNavigator').default;
  const navRef = createNavigationContainerRef();

  const root = await render(
    <NavigationContainer ref={navRef}>
      <RootNavigator />
    </NavigationContainer>,
  );
  await act(async () => navRef.navigate(ROUTES.MAIN_TABS));

  const evaluateTab = root.find(
    n => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === 'Evaluate',
  );
  await act(async () => evaluateTab.props.onPress());

  expect(navRef.getCurrentRoute().name).toBe(ROUTES.EVALUATE_CHAT);
});
