/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '../src/navigation/RootNavigator';
import LoginPrompt from '../src/screens/auth/LoginPrompt/LoginPrompt';
import { BottomSheet, MenuGroup } from '../src/components';
import { navigationRef } from '../src/navigation/navigationRef';
import { initialRouteFor, resetAfterSignIn } from '../src/navigation/authRoutes';
import { ROUTES } from '../src/navigation/routes';
import { clearUser, setUser } from '../src/store/userStore';
import { closeLoginPrompt, requireLogin } from '../src/store/loginPromptStore';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;

// The app as a guest who chose "Browse cars without login".
const renderGuestApp = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator initialRoute={{ name: ROUTES.MAIN_TABS }} />
        </NavigationContainer>
        <LoginPrompt />
      </SafeAreaProvider>,
    );
  });
  return tree.root;
};

const tab = (root, label) =>
  root.find(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === label);
const hasText = (root, text) => root.findAll(n => n.props.children === text).length > 0;
const promptOpen = root => root.findByType(LoginPrompt).findByType(BottomSheet).props.visible;
const currentRoute = () => navigationRef.getCurrentRoute()?.name;

beforeEach(() => {
  jest.useFakeTimers();
  clearUser();
});

afterEach(() => {
  act(() => closeLoginPrompt());
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('Someone who chose to browse opens the app on the marketplace', () => {
  expect(initialRouteFor(null, { introSeen: true, guest: true })).toEqual({ name: ROUTES.MAIN_TABS });
  expect(initialRouteFor(null, { introSeen: true })).toEqual({ name: ROUTES.LOGIN });
});

test('Garage and Saved ask a guest to log in', async () => {
  const root = await renderGuestApp();

  await act(async () => tab(root, 'Garage').props.onPress());
  expect(hasText(root, 'Your vehicles, in one place')).toBe(true);

  await act(async () => tab(root, 'Saved').props.onPress());
  expect(hasText(root, 'Save cars you like')).toBe(true);
});

test('Profile shows a guest the usual cards; an account page asks them to log in there', async () => {
  const root = await renderGuestApp();

  await act(async () => tab(root, 'Profile').props.onPress());
  const groups = root.findAllByType(MenuGroup);
  expect(groups.map(g => g.props.title)).toEqual(['Profile Setting', 'Help & Support', 'Legal']);
  expect(groups[0].props.items.map(i => i.label)).toEqual([
    'Personal Information',
    'Identity verification',
    'My inspections',
    'My offers',
    'My listings',
    'Settlements',
    'Payout accounts',
    'Language',
  ]);

  const myOffers = groups[0].props.items.find(i => i.label === 'My offers');
  await act(async () => myOffers.onPress());
  expect(currentRoute()).toBe(ROUTES.MY_OFFERS);
  expect(hasText(root, 'Your offers')).toBe(true);
  expect(hasText(root, 'Log in to make offers on cars you like and follow every offer here.')).toBe(true);
});

test('Evaluate asks a guest to log in; "Log in or sign up" opens Login over the app', async () => {
  const root = await renderGuestApp();

  await act(async () => tab(root, 'Evaluate').props.onPress());
  expect(currentRoute()).toBe(ROUTES.MARKET);
  expect(promptOpen(root)).toBe(true);
  expect(hasText(root, 'Log in to find out what your vehicle is worth with TURAG.AI.')).toBe(true);

  const logIn = root.findAll(n => n.props.title === 'Log in or sign up' && n.props.onPress)[0];
  await act(async () => logIn.props.onPress());
  expect(promptOpen(root)).toBe(false);
  expect(currentRoute()).toBe(ROUTES.LOGIN);
  expect(navigationRef.getCurrentRoute().params).toEqual({ fromGuest: true });
});

test('A guest who logs in from a car page comes back to it', () => {
  const under = [
    { key: 'tabs', name: ROUTES.MAIN_TABS },
    { key: 'car', name: ROUTES.VEHICLE_LISTING, params: { vehicle: { id: 'v1' } } },
  ];
  const navigation = {
    reset: jest.fn(),
    getState: () => ({
      routes: [...under, { key: 'login', name: ROUTES.LOGIN }, { key: 'otp', name: ROUTES.VERIFY_OTP }],
    }),
  };
  const success = { titleKey: 'auth.loginSuccessful', next: ROUTES.MAIN_TABS };

  resetAfterSignIn(navigation, [ROUTES.AUTH_SUCCESS, success]);
  expect(navigation.reset).toHaveBeenLastCalledWith({
    index: 2,
    routes: [...under, { name: ROUTES.AUTH_SUCCESS, params: { ...success, goBack: true } }],
  });

  // A new account fills in Create Account on its own first.
  resetAfterSignIn(navigation, [ROUTES.COMPLETE_PROFILE, { phone: '9876543210' }]);
  expect(navigation.reset).toHaveBeenLastCalledWith({
    index: 0,
    routes: [{ name: ROUTES.COMPLETE_PROFILE, params: { phone: '9876543210' } }],
  });

  // An inspector goes to their own app.
  const inspector = { titleKey: 'auth.loginSuccessful', next: ROUTES.INSPECTOR_TABS };
  resetAfterSignIn(navigation, [ROUTES.AUTH_SUCCESS, inspector]);
  expect(navigation.reset).toHaveBeenLastCalledWith({
    index: 0,
    routes: [{ name: ROUTES.AUTH_SUCCESS, params: inspector }],
  });
});

test('Signed in, nothing asks to log in', () => {
  setUser({ fullName: 'Test User', role: 'individual' });
  expect(requireLogin('save')).toBe(true);
  clearUser();
  expect(requireLogin('save')).toBe(false);
});
