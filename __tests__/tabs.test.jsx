/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import RootNavigator from '../src/navigation/RootNavigator';
import { Icon, SearchBar } from '../src/components';
import { ROUTES } from '../src/navigation/routes';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;
const navRef = createNavigationContainerRef();

const renderApp = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <NavigationContainer ref={navRef}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>,
    );
  });
  await act(async () => navRef.navigate(ROUTES.MAIN_TABS));
  return tree.root;
};

const tab = (root, label) =>
  root.find(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === label);

// Icons inside the tab buttons: [{ name, filled }]
const tabIcons = root =>
  ['Market', 'Evaluate', 'Garage', 'Saved', 'Profile'].map(label => {
    const icon = tab(root, label).findByType(Icon);
    return { name: icon.props.name, filled: icon.props.filled };
  });

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('Only the selected tab icon is solid', async () => {
  const root = await renderApp();
  expect(tabIcons(root).filter(i => i.filled).map(i => i.name)).toEqual(['store']);

  await act(async () => tab(root, 'Saved').props.onPress());
  expect(tabIcons(root).filter(i => i.filled).map(i => i.name)).toEqual(['bookmark']);
});

test('Saved search is cleared after leaving and returning to the tab', async () => {
  const root = await renderApp();
  await act(async () => tab(root, 'Saved').props.onPress());

  // Market and Saved both stay mounted; Market's search box only shows once
  // its search button is tapped, so Saved's is the last one.
  const savedSearch = () => root.findAllByType(SearchBar).at(-1);

  await act(async () => savedSearch().props.onChangeText('swift'));
  expect(savedSearch().props.value).toBe('swift');

  await act(async () => tab(root, 'Market').props.onPress());
  await act(async () => tab(root, 'Saved').props.onPress());

  expect(savedSearch().props.value).toBe('');
});
