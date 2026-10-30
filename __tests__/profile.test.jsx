/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Switch } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Profile from '../src/screens/profile/Profile/Profile';
import PersonalInfo from '../src/screens/profile/PersonalInfo/PersonalInfo';
import { Badge, ConfirmDialog, KeyValueRow, MenuGroup, MenuRow } from '../src/components';
import { clearUser, getUser, setUser } from '../src/store/userStore';
import { ROUTES } from '../src/navigation/routes';
import * as profileApi from '../src/api/services/profile.api';

// Personal Information sets the status bar when it comes into view; here, once after mounting.
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

let tree;

const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};

const row = (root, label) => root.findAllByType(MenuRow).find(r => r.props.label === label);

// Signed in (a guest gets the login prompts instead - see guest.test.jsx).
beforeEach(() => setUser({ fullName: 'Test User', role: 'individual' }));
afterEach(() => clearUser());

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('Profile shows Profile Setting, Help & Support, Legal and Account', async () => {
  const root = await render(<Profile navigation={{ navigate: jest.fn() }} />);

  expect(root.findAllByType(MenuGroup).map(g => g.props.title)).toEqual([
    'Profile Setting',
    'Help & Support',
    'Legal',
    'Account',
  ]);
  const account = root.findAllByType(MenuGroup).find(g => g.props.title === 'Account');
  expect(account.props.items.map(i => i.label)).toEqual(['Log Out', 'Delete Account']);
});

test('Menu rows open Personal Information or the website page in the app', async () => {
  const navigation = { navigate: jest.fn() };
  const root = await render(<Profile navigation={navigation} />);

  await act(async () => row(root, 'Personal Information').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PERSONAL_INFO);

  await act(async () => row(root, 'FAQs').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.WEB_PAGE, { title: 'FAQs', path: '/faq' });

  await act(async () => row(root, 'Privacy Policy').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.WEB_PAGE, {
    title: 'Privacy Policy',
    path: '/privacy_policy',
  });
});

test('Log Out asks for confirmation, then clears the user and returns to Welcome', async () => {
  act(() => setUser({ fullName: 'Ram Todkar', role: 'individual' }));
  const reset = jest.fn();
  const navigation = { navigate: jest.fn(), getParent: () => ({ reset }) };
  const root = await render(<Profile navigation={navigation} />);

  await act(async () => row(root, 'Log Out').props.onPress());
  const dialog = root.findByType(ConfirmDialog);
  expect(dialog.props.visible).toBe(true);
  expect(dialog.props.confirmLabel).toBe('Log Out');

  await act(async () => {
    dialog.props.onConfirm();
  });
  await act(async () => {
    jest.advanceTimersByTime(400);
  });

  expect(getUser()).toBeNull();
  expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.LOGIN }] });
});

test('Personal Information shows name, role, details and verified consents', async () => {
  act(() => setUser({ fullName: 'Manish Thakre', role: 'individual' }));
  const root = await render(<PersonalInfo navigation={{ goBack: jest.fn() }} />);
  await act(async () => {
    jest.advanceTimersByTime(500);
  });

  expect(root.findAll(n => n.props.children === 'Manish Thakre').length).toBeGreaterThan(0);
  expect(root.findAll(n => n.props.children === 'Consumer').length).toBeGreaterThan(0);

  const labels = root.findAllByType(KeyValueRow).map(r => r.props.label);
  expect(labels).toEqual([
    'Mobile',
    'Account ID',
    'Language',
    'Account Terms',
    'Privacy Policy',
    'Offers and updates',
  ]);
  // Terms + Privacy as badges; Marketing (optional, as the web) is an on / off switch.
  expect(root.findAllByType(Badge).map(b => b.props.label)).toEqual(['Verified', 'Verified']); // Terms + Privacy (the role is a pill in the header)
  expect(root.findByType(Switch).props.value).toBe(true);
});

test('Marketing switch: records just that choice, and turns back if saving fails', async () => {
  const save = jest.spyOn(profileApi, 'setOptionalConsent');
  act(() => setUser({ fullName: 'Manish Thakre', role: 'individual' }));
  const root = await render(<PersonalInfo navigation={{ goBack: jest.fn() }} />);
  await act(async () => {
    jest.advanceTimersByTime(500);
  });

  await act(async () => root.findByType(Switch).props.onValueChange(false));
  expect(save).toHaveBeenCalledWith('MARKETING', false);
  expect(root.findByType(Switch).props.value).toBe(false);

  save.mockRejectedValueOnce(new Error('Network down'));
  await act(async () => root.findByType(Switch).props.onValueChange(true));
  expect(root.findByType(Switch).props.value).toBe(false);
  expect(root.findAll(n => n.props.children === 'Network down').length).toBeGreaterThan(0);
});

test('Delete account (as the web): type DELETE to confirm, then deleted, signed out and back to Login', async () => {
  const del = jest.spyOn(profileApi, 'deleteMyAccount').mockResolvedValue();
  const reset = jest.fn();
  act(() => setUser({ fullName: 'Raj', role: 'individual' }));
  const root = await render(<Profile navigation={{ navigate: jest.fn(), reset, getParent: () => null }} />);

  await act(async () => row(root, 'Delete Account').props.onPress());
  const button = title => root.findAll(n => n.props.title === title && n.props.onPress)[0];
  const field = () => root.findAll(n => n.props.placeholder === 'DELETE' && n.props.onChangeText)[0];
  expect(field()).toBeDefined();
  expect(button('Delete permanently').props.disabled).toBe(true);

  await act(async () => field().props.onChangeText('DELET'));
  expect(button('Delete permanently').props.disabled).toBe(true); // the whole word
  // Any capitals (some keyboards don't capitalise).
  await act(async () => field().props.onChangeText('delete'));
  expect(button('Delete permanently').props.disabled).toBe(false);
  await act(async () => field().props.onChangeText('DELETE'));
  expect(button('Delete permanently').props.disabled).toBe(false);

  await act(async () => button('Delete permanently').props.onPress());
  expect(del).toHaveBeenCalledTimes(1);
  expect(getUser()).toBeNull();
  expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: ROUTES.LOGIN, params: { accountDeleted: true } }] });
  del.mockRestore();
});

test('Delete account: if it fails, the reason shows and nothing is signed out', async () => {
  const del = jest.spyOn(profileApi, 'deleteMyAccount').mockRejectedValue(new Error('Server busy'));
  const reset = jest.fn();
  act(() => setUser({ fullName: 'Raj', role: 'individual' }));
  const root = await render(<Profile navigation={{ navigate: jest.fn(), reset, getParent: () => null }} />);
  await act(async () => row(root, 'Delete Account').props.onPress());
  const field = root.findAll(n => n.props.placeholder === 'DELETE' && n.props.onChangeText)[0];
  await act(async () => field.props.onChangeText('DELETE'));
  await act(async () => root.findAll(n => n.props.title === 'Delete permanently' && n.props.onPress)[0].props.onPress());
  expect(root.findAll(n => n.props.children === 'Server busy').length).toBeGreaterThan(0);
  expect(reset).not.toHaveBeenCalled();
  expect(getUser()).not.toBeNull();
  del.mockRestore();
});

test('Email (as the web): unverified with "Resend link"; Change saves a new one and sends its link', async () => {
  const save = jest.spyOn(profileApi, 'saveMyEmail').mockResolvedValue({ sent: true });
  act(() => setUser({ fullName: 'Raj', role: 'individual', email: 'raj@gmail.com' }));
  const root = await render(<PersonalInfo navigation={{ goBack: jest.fn() }} />);
  await act(async () => {
    jest.advanceTimersByTime(500);
  });
  const said = text => root.findAll(n => typeof n.props.children === 'string' && n.props.children.includes(text)).length > 0;
  const tap = async text =>
    act(async () => root.findAll(n => n.props.onPress && n.findAll(c => c.props.children === text).length > 0)[0].props.onPress());

  expect(root.findAllByType(Badge).map(b => b.props.label)).toContain('Unverified');
  await tap('Resend link');
  expect(save).toHaveBeenCalledWith('raj@gmail.com');
  expect(said('Verification link sent to raj@gmail.com.')).toBe(true);

  await tap('Change email');
  const field = root.findAll(n => n.props.placeholder === 'you@example.com' && n.props.onChangeText)[0];
  await act(async () => field.props.onChangeText('raj.new@gmail.com'));
  await tap('Save & send link');
  expect(save).toHaveBeenLastCalledWith('raj.new@gmail.com');
  expect(said('raj.new@gmail.com')).toBe(true);
  save.mockRestore();
});
