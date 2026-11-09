/**
 * Parity fixes, round 2 (2026-11-07): the reasons a photo failed the check, a recorded
 * clip's real length, the website's pages in the app's language, the sign-up choices,
 * a remembered bike price on another tab, and a dealer's account type.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppText } from '../src/components';
import { translate, setLanguage } from '../src/i18n';
import { integrityReasonLines, integrityReasonsFor } from '../src/screens/selfInspection/SelfInspection/integrityReasons';
import { clipLength } from '../src/screens/selfInspection/VideoRecorder/clipLength';
import { PURPOSES } from '../src/screens/auth/CompleteProfile/constants';
import { priceCategory } from '../src/screens/home/Home/constants';
import WebPage from '../src/screens/common/WebPage/WebPage';
import Search from '../src/screens/search/Search/Search';
import PersonalInfo from '../src/screens/profile/PersonalInfo/PersonalInfo';
import { addRecentSearch, clearRecentSearches } from '../src/store/recentSearchStore';
import { clearUser, setUser } from '../src/store/userStore';
import { ROUTES } from '../src/navigation/routes';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useFocusEffect: callback => useEffect(callback, [callback]),
  };
});

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={METRICS}>{element}</SafeAreaProvider>);
  });
  await act(async () => {});
  return tree.root;
};
const texts = root =>
  root
    .findAllByType(AppText)
    .map(n => [].concat(n.props.children).join(''))
    .filter(Boolean);

afterEach(() => {
  if (tree) {
    act(() => tree.unmount());
    tree = null;
  }
});

describe('why a photo failed the check (as the web), one line each', () => {
  const t = (key, params) => translate('en', key, params);
  const items = [{ item_code: 'B1', label: 'Body panel condition' }, { item_code: 'XDOC', label: 'Insurance' }];
  const flagged = (id, code, shot, key, kind = 'PHOTO') => ({
    id,
    item_code: code,
    shot_code: shot,
    kind,
    integrity: { risk_score: 90, signals: key ? [{ key, status: 'FAIL' }] : [] },
  });

  test('each reason in plain words, with the angle; repeats shown once; passed photos left out', () => {
    const reasons = integrityReasonsFor([
      flagged('m1', 'B1', 'WALK_FRONT', 'exact_duplicate'),
      flagged('m2', 'B1', 'WALK_LEFT', 'screenshot_detection'),
      flagged('m3', 'B1', 'WALK_LEFT', 'screenshot_detection'),
      flagged('m4', 'XDOC', 'XDOC', 'exact_duplicate', 'DOCUMENT'),
      flagged('m5', 'B1', 'WALK_REAR', null),
      { id: 'ok', item_code: 'B1', shot_code: 'WALK_RIGHT', kind: 'PHOTO', integrity: { risk_score: 10, signals: [] } },
    ]);
    expect(integrityReasonLines(t, reasons, items).map(line => line.text)).toEqual([
      'The Body panel condition (Front) is an exact copy of another photo. Please take a fresh photo.',
      'The Body panel condition (Left side) looks like a screenshot, not a camera photo. Please take it with the camera.',
      'The Insurance is an exact copy of another document. Please upload a fresh one.',
      "The Body panel condition (Rear) couldn't be verified — please retake it.",
    ]);
  });
});

describe("a recorded clip's length", () => {
  test('stopped at the limit: exactly the limit, whatever the clock says', () => {
    expect(clipLength({ reason: 'max-duration-reached', maxS: 45, recordedSeconds: 44.9, clockSeconds: 46.8 })).toBe(45);
  });
  test("stopped by hand: the recorder's own count, not the stopwatch", () => {
    expect(clipLength({ reason: 'stopped', maxS: 45, recordedSeconds: 31.2, clockSeconds: 32.9 })).toBe(31.2);
  });
  test('no count from the recorder: the clock', () => {
    expect(clipLength({ reason: 'stopped', maxS: 45, recordedSeconds: 0, clockSeconds: 33 })).toBe(33);
  });
});

describe("the website's pages in the app's language", () => {
  const view = root => root.findAll(n => n.props.injectedJavaScriptBeforeContentLoaded)[0];
  const spinner = root => root.findAll(n => n.type?.displayName === 'ActivityIndicator' || n.type === 'ActivityIndicator');

  afterEach(async () => {
    await act(async () => setLanguage('en'));
  });

  test('the language goes in the cookie the site reads, and the page re-loads once if it came back in another', async () => {
    await act(async () => setLanguage('hi'));
    const root = await render(<WebPage navigation={{ goBack: jest.fn() }} route={{ params: { title: 'FAQs', path: '/faq' } }} />);
    expect(view(root).props.injectedJavaScriptBeforeContentLoaded).toContain("tg_locale=hi; path=/");
    expect(view(root).props.injectedJavaScript).toContain("have!=='hi'");
    expect(view(root).props.injectedJavaScript).toContain('location.reload()');
  });

  test('the loader stays while the page re-loads, and goes once it says it is ready', async () => {
    const root = await render(<WebPage navigation={{ goBack: jest.fn() }} route={{ params: { title: 'FAQs', path: '/faq' } }} />);
    expect(spinner(root).length).toBeGreaterThan(0);
    await act(async () => view(root).props.onMessage({ nativeEvent: { data: 'page-reloading' } }));
    expect(spinner(root).length).toBeGreaterThan(0);
    await act(async () => view(root).props.onMessage({ nativeEvent: { data: 'page-ready' } }));
    expect(spinner(root)).toHaveLength(0);
  });
});

test('sign-up offers what the web offers: no storage yard (Turag sets those up itself)', () => {
  expect(PURPOSES.map(p => p.value)).toEqual(['buy_sell', 'dealer', 'bank']);
});

describe('a remembered price search on another tab', () => {
  test('a bike price belongs to Bikes, a car price to All', () => {
    expect(priceCategory('0-50000')).toBe('bikes');
    expect(priceCategory('500000-1000000')).toBe('all');
    expect(priceCategory('nope')).toBeNull();
  });

  test('tapped while All is open: the bike price opens on Bikes instead of being dropped', async () => {
    clearRecentSearches();
    addRecentSearch({ query: 'Under ₹50,000', filter: { id: 'price', value: '0-50000' }, labelKey: 'home.filter.price.bikeUnder50k' });
    const navigation = { popTo: jest.fn(), goBack: jest.fn(), navigate: jest.fn() };
    const root = await render(<Search navigation={navigation} route={{ params: {} }} />);
    const recent = root.findAll(n => n.props.accessibilityLabel === 'Search Under ₹50,000' && n.props.onPress)[0];
    await act(async () => recent.props.onPress());
    expect(navigation.popTo).toHaveBeenCalledWith(
      expect.any(String),
      { screen: ROUTES.MARKET, params: expect.objectContaining({ filter: { id: 'price', value: '0-50000', category: 'bikes' } }) },
      { merge: true },
    );
    clearRecentSearches();
  });
});

test("a dealer's account type reads Dealer, as the web's Account page", async () => {
  act(() => setUser({ fullName: 'Asha Motors', role: 'individual', roles: ['dealer', 'consumer'] }));
  const root = await render(<PersonalInfo navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  expect(texts(root)).toContain('Dealer');
  expect(texts(root)).not.toContain('Consumer');
  act(() => clearUser());
});
