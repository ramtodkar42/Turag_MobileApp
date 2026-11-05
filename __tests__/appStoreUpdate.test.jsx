/**
 * iPhone: the update popup when the App Store has a newer version, at most once a day.
 * (Tests run as iOS; the version comes from the mock in jest.setup.js: 1.0.0.)
 */
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppStoreUpdatePrompt from '../src/components/feedback/AppStoreUpdatePrompt';
import { removePref } from '../src/utils/appPrefs';
import { isNewerVersion } from '../src/utils/version';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const TITLE = 'Update available';
const URL = 'https://apps.apple.com/in/app/turag/id123';

const lookup = results => Promise.resolve({ ok: true, json: () => Promise.resolve({ results }) });
const listed = (version, minimumOsVersion = '15.1') => lookup([{ version, trackViewUrl: URL, minimumOsVersion }]);

let tree;
const render = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <AppStoreUpdatePrompt />
      </SafeAreaProvider>,
    );
  });
  await act(async () => {});
  return tree.root;
};
const shown = root => root.findAll(n => n.props.children === TITLE).length > 0;
const button = (root, title) => root.findAll(n => n.props.title === title && n.props.onPress)[0];

const realFetch = global.fetch;
beforeAll(() => {
  // Jest's Platform has no iOS version of its own.
  Object.defineProperty(Platform, 'Version', { get: () => '18.0', configurable: true });
});
beforeEach(async () => {
  global.fetch = jest.fn();
  await removePref('updatePromptAt');
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  global.fetch = realFetch;
  jest.restoreAllMocks();
});

test('a newer version: asks using this app, and Update opens its App Store page', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue();
  global.fetch.mockReturnValue(listed('1.0.1'));
  const root = await render();
  expect(global.fetch.mock.calls[0][0]).toBe('https://itunes.apple.com/lookup?bundleId=ai.turag.app&country=in');
  expect(shown(root)).toBe(true);
  await act(async () => button(root, 'Update').props.onPress());
  expect(open).toHaveBeenCalledWith(URL);
  expect(shown(root)).toBe(false);
});

test('Not now closes it, and it does not ask again the same day', async () => {
  global.fetch.mockReturnValue(listed('1.0.1'));
  let root = await render();
  await act(async () => button(root, 'Not now').props.onPress());
  expect(shown(root)).toBe(false);
  act(() => tree.unmount());
  root = await render();
  expect(shown(root)).toBe(false);
});

test('no popup: up to date, not listed yet, a failed lookup, or an iPhone too old for it', async () => {
  const cases = [
    () => listed('1.0.0'),
    () => listed('1.0'),
    () => lookup([]),
    () => Promise.reject(new Error('offline')),
    () => Promise.resolve({ ok: false }),
    () => listed('1.0.1', '99.0'),
  ];
  for (const result of cases) {
    global.fetch.mockReturnValue(result());
    const root = await render();
    expect(shown(root)).toBe(false);
    act(() => tree.unmount());
  }
});

test('versions compare number by number', () => {
  expect(isNewerVersion('1.0.10', '1.0.9')).toBe(true);
  expect(isNewerVersion('1.1', '1.0.9')).toBe(true);
  expect(isNewerVersion('2.0.0', '10.0.0')).toBe(false);
  expect(isNewerVersion('1.0', '1.0.0')).toBe(false);
  expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
});
