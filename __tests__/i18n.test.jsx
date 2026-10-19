/**
 * App languages: translation lookups, switching, saving, and that every
 * English string has a Hindi and a Marathi version.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import en from '../src/i18n/locales/en';
import hi from '../src/i18n/locales/hi';
import mr from '../src/i18n/locales/mr';
import {
  getLanguage,
  initLanguage,
  LANGUAGES,
  setLanguage,
  tNow,
  translate,
  useT,
} from '../src/i18n';
import { loadLanguage, saveLanguage } from '../src/i18n/storage';
import AppText from '../src/components/common/AppText';
import Language from '../src/screens/profile/Language/Language';
import Profile from '../src/screens/profile/Profile/Profile';
import { MenuRow } from '../src/components';
import { timeAgo } from '../src/utils/date';

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

afterEach(async () => {
  act(() => tree?.unmount());
  tree = null;
  await act(async () => setLanguage('en'));
});

const placeholders = text => (String(text).match(/\{\w+\}/g) ?? []).sort().join(',');

describe('translations are complete', () => {
  test.each([
    ['hi', hi],
    ['mr', mr],
  ])('every English string exists in %s, with the same {placeholders}', (code, dict) => {
    const missing = Object.keys(en).filter(key => dict[key] == null);
    expect(missing).toEqual([]);
    const badParams = Object.keys(en).filter(
      key => dict[key] != null && placeholders(dict[key]) !== placeholders(en[key]),
    );
    expect(badParams).toEqual([]);
  });

  test('no strings that only exist in Hindi or Marathi', () => {
    expect(Object.keys(hi).filter(key => en[key] == null)).toEqual([]);
    expect(Object.keys(mr).filter(key => en[key] == null)).toEqual([]);
  });
});

describe('translate', () => {
  test('looks up, fills {params}, picks plurals and falls back to English', () => {
    expect(translate('en', 'common.cancel')).toBe('Cancel');
    expect(translate('hi', 'common.cancel')).toBe('रद्द करें');
    expect(translate('mr', 'common.cancel')).toBe('रद्द करा');
    expect(translate('en', 'common.date.minAgo', { count: 5 })).toBe('5 min ago');
    expect(translate('hi', 'home.hello', { name: 'Raj' })).toBe('नमस्ते Raj');
    // Unknown key: the key itself (never blank, never a crash).
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(translate('mr', 'nope.missing')).toBe('nope.missing');
    console.warn.mockRestore();
  });

  test('dates and "time ago" follow the app language', async () => {
    const now = new Date(2026, 9, 3, 15, 0).getTime();
    await act(async () => setLanguage('mr'));
    expect(timeAgo(now - 5 * 60 * 1000, now)).toBe('5 मिनिटांपूर्वी');
    expect(timeAgo(new Date(2026, 8, 12).getTime(), now)).toBe('12 सप्टें');
    await act(async () => setLanguage('en'));
    expect(timeAgo(now - 5 * 60 * 1000, now)).toBe('5 min ago');
  });
});

describe('choosing a language', () => {
  test('switching updates screens at once and is remembered on the phone', async () => {
    function Greeting() {
      const t = useT();
      return <Text>{t('common.cancel')}</Text>;
    }
    const root = await render(<Greeting />);
    expect(root.findByType(Text).props.children).toBe('Cancel');

    await act(async () => setLanguage('hi'));
    expect(root.findByType(Text).props.children).toBe('रद्द करें');
    expect(getLanguage()).toBe('hi');
    expect(await loadLanguage()).toBe('hi');
    expect(tNow('common.cancel')).toBe('रद्द करें');
  });

  test('app start uses the saved language, else the phone language', async () => {
    await saveLanguage('mr');
    await expect(initLanguage()).resolves.toBe('mr');

    await saveLanguage('xx'); // not supported -> phone language (English in tests)
    await expect(initLanguage()).resolves.toBe('en');
  });

  test('Hindi / Marathi get taller lines so letters are not cut off', async () => {
    const style = { lineHeight: 20 };
    const root = await render(<AppText style={style}>x</AppText>);
    const lineHeight = () =>
      [].concat(root.findByType(Text).props.style).flat(3).filter(Boolean).reduce((a, s) => ({ ...a, ...s }), {})
        .lineHeight;
    expect(lineHeight()).toBe(20);
    await act(async () => setLanguage('mr'));
    expect(lineHeight()).toBe(25);
  });
});

describe('Language screen', () => {
  test('lists the three languages in their own script and switches on tap', async () => {
    const root = await render(<Language navigation={{ goBack: jest.fn() }} />);
    const options = () => root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.onPress);

    expect(options().map(o => o.props.accessibilityLabel)).toEqual(['English', 'हिन्दी, Hindi', 'मराठी, Marathi']);
    expect(options()[0].props.accessibilityState).toEqual({ selected: true });

    await act(async () => options()[2].props.onPress());
    expect(getLanguage()).toBe('mr');
    expect(options()[2].props.accessibilityState).toEqual({ selected: true });
    // The screen itself is now in Marathi.
    expect(root.findAll(n => n.props.title === 'भाषा').length).toBeGreaterThan(0);
  });

  test('Profile shows the current language and opens the Language screen', async () => {
    const navigation = { navigate: jest.fn(), getParent: () => null };
    const root = await render(<Profile navigation={navigation} />);
    const languageRow = () => root.findAllByType(MenuRow).find(r => r.props.label === 'Language');

    expect(languageRow().props.value).toBe('English');
    await act(async () => languageRow().props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('Language');

    await act(async () => setLanguage('hi'));
    const row = root.findAllByType(MenuRow).find(r => r.props.label === 'भाषा');
    expect(row.props.value).toBe('हिन्दी');
  });

  test('the language list matches the dictionaries', () => {
    expect(LANGUAGES.map(l => l.code)).toEqual(['en', 'hi', 'mr']);
  });
});
