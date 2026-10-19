/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Profile from '../src/screens/profile/Profile/Profile';
import PersonalInfo from '../src/screens/profile/PersonalInfo/PersonalInfo';
import { Badge, ConfirmDialog, KeyValueRow, MenuGroup, MenuRow } from '../src/components';
import { getUser, setUser } from '../src/store/userStore';
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

const row = (root, label) => root.findAllByType(MenuRow).find(r => r.props.label === label);

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('Profile shows only Profile Setting, Help & Support and Account', async () => {
  const root = await render(<Profile navigation={{ navigate: jest.fn() }} />);

  expect(root.findAllByType(MenuGroup).map(g => g.props.title)).toEqual([
    'Profile Setting',
    'Help & Support',
    'Account',
  ]);
  const account = root.findAllByType(MenuGroup).find(g => g.props.title === 'Account');
  expect(account.props.items.map(i => i.label)).toEqual(['Log Out', 'Delete Account']);
});

test('Menu rows open Personal Information or a placeholder page', async () => {
  const navigation = { navigate: jest.fn() };
  const root = await render(<Profile navigation={navigation} />);

  await act(async () => row(root, 'Personal Information').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PERSONAL_INFO);

  await act(async () => row(root, 'FAQs').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PROFILE_SECTION, {
    title: 'FAQs',
    showBack: true,
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
    'Marketing',
  ]);
  expect(root.findAllByType(Badge).map(b => b.props.label)).toEqual([
    'Verified',
    'Verified',
    'Verified',
  ]);
});

test('Delete Account popup shows Cancel first, then OK', async () => {
  const root = await render(<Profile navigation={{ navigate: jest.fn() }} />);

  await act(async () => row(root, 'Delete Account').props.onPress());
  const dialog = root.findByType(ConfirmDialog);
  expect(dialog.props.visible).toBe(true);
  expect(dialog.props.cancelLabel).toBe('Cancel');
  expect(dialog.props.confirmLabel).toBe('OK');

  const buttons = dialog.findAll(n => n.props.title && n.props.onPress && n.props.variant !== undefined);
  expect(buttons.map(b => b.props.title).slice(0, 1)).toEqual(['Cancel']);

  await act(async () => dialog.props.onCancel());
  expect(root.findByType(ConfirmDialog).props.visible).toBe(false);
});
