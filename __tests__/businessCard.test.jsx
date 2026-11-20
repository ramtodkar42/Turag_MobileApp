/**
 * A business member (dealer, lender, yard) finds their part of the app first thing
 * on Home: one light row (like "pick up where you left off") that says just which
 * portal - never the company's name - and opens Business accounts. No close X.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import BusinessCard from '../src/screens/home/Home/components/BusinessCard';
import useMyOrganizations from '../src/hooks/useMyOrganizations';

// Profile reloads (the dealer application) when it comes into view; here, once after mounting.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

jest.mock('../src/hooks/useMyOrganizations', () => ({ __esModule: true, default: jest.fn() }));

const dealer = { id: 'org_1', name: 'Paradox Motors', type: 'DEALER', status: 'ACTIVE', role: 'ADMIN', active: true, portal: 'DEALER' };
const lender = { id: 'org_2', name: 'Pune Finance', type: 'LENDER', status: 'ACTIVE', role: 'MEMBER', active: true, portal: 'INSTITUTIONAL' };

const buttons = root => root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
const texts = root => [...new Set(root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children))];
const render = async element => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree.root;
};

test('a dealer sees just "Dealer dashboard" and Open; a tap goes to Business accounts', async () => {
  useMyOrganizations.mockReturnValue({ orgs: [dealer], loading: false });
  const onOpen = jest.fn();
  const root = await render(<BusinessCard onOpen={onOpen} />);
  expect(texts(root)).toEqual(['Dealer dashboard', 'Open']);
  // Not the company's name.
  expect(texts(root).join(' ')).not.toContain('Paradox');
  // One button (the whole row): no close X, it always stays.
  expect(buttons(root)).toHaveLength(1);
  await act(async () => buttons(root)[0].props.onPress());
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('a lender sees "Institutional portal", without the name', async () => {
  useMyOrganizations.mockReturnValue({ orgs: [lender], loading: false });
  const root = await render(<BusinessCard onOpen={jest.fn()} />);
  expect(texts(root)).toEqual(['Institutional portal', 'Open']);
});

test('several organizations: "Business accounts"', async () => {
  useMyOrganizations.mockReturnValue({ orgs: [dealer, lender], loading: false });
  const root = await render(<BusinessCard onOpen={jest.fn()} />);
  expect(texts(root)).toEqual(['Business accounts', 'Open']);
});

test('nothing for everyone else, or while loading', async () => {
  useMyOrganizations.mockReturnValue({ orgs: [], loading: false });
  expect(buttons(await render(<BusinessCard onOpen={jest.fn()} />))).toHaveLength(0);
  useMyOrganizations.mockReturnValue({ orgs: [], loading: true });
  expect(buttons(await render(<BusinessCard onOpen={jest.fn()} />))).toHaveLength(0);
});

describe('Profile: the business item says which kind', () => {
  const { SafeAreaProvider } = require('react-native-safe-area-context');
  const Profile = require('../src/screens/profile/Profile/Profile').default;
  const { clearUser, setUser } = require('../src/store/userStore');
  const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

  beforeEach(() => setUser({ contact: '9876543210' }));
  afterEach(() => clearUser());

  const labels = async orgs => {
    useMyOrganizations.mockReturnValue({ orgs, loading: false });
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <Profile navigation={{ navigate: jest.fn(), getParent: () => null }} />
        </SafeAreaProvider>,
      );
    });
    await act(async () => {});
    const shown = texts(tree.root);
    act(() => tree.unmount());
    return shown;
  };

  test('only dealerships: "Dealer business account"', async () => {
    const shown = await labels([dealer]);
    expect(shown).toContain('Dealer business account');
    expect(shown).not.toContain('Business accounts');
  });

  test('a lender (or a mix): "Business accounts"; no organization: neither', async () => {
    expect(await labels([lender])).toContain('Business accounts');
    expect(await labels([dealer, lender])).toContain('Business accounts');
    const none = await labels([]);
    expect(none).not.toContain('Business accounts');
    expect(none).not.toContain('Dealer business account');
  });
});
