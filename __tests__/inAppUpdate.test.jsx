/**
 * Google Play's in-app update (Android): the prompt on app open, at most once a day,
 * and the Restart bar once it has downloaded.
 */
import ReactTestRenderer, { act } from 'react-test-renderer';
import { DeviceEventEmitter, NativeModules } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { removePref } from '../src/utils/appPrefs';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const READY = 'Update downloaded. Restart to finish.';

const updater = {
  check: jest.fn(),
  start: jest.fn(),
  install: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};
NativeModules.InAppUpdate = updater;
// Reads the native module when it loads, so after it's set above.
const AppUpdatePrompt = require('../src/components/feedback/AppUpdatePrompt').default;

let tree;
const render = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <AppUpdatePrompt />
      </SafeAreaProvider>,
    );
  });
  await act(async () => {});
  return tree.root;
};
const shown = root => root.findAll(n => n.props.children === READY).length > 0;

beforeEach(async () => {
  jest.clearAllMocks();
  updater.start.mockResolvedValue(true);
  await removePref('updatePromptAt');
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
});

test('a newer version: Google prompt once a day, not on every open', async () => {
  updater.check.mockResolvedValue({ available: true, downloaded: false });
  await render();
  expect(updater.start).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  await render();
  expect(updater.start).toHaveBeenCalledTimes(1);
});

test('up to date, or not installed from Play: nothing happens', async () => {
  updater.check.mockResolvedValueOnce({ available: false, downloaded: false });
  let root = await render();
  expect(updater.start).not.toHaveBeenCalled();
  expect(shown(root)).toBe(false);
  act(() => tree.unmount());
  updater.check.mockRejectedValueOnce(new Error('not from Play'));
  root = await render();
  expect(updater.start).not.toHaveBeenCalled();
  expect(shown(root)).toBe(false);
});

test('once downloaded: stays until Restart installs it', async () => {
  updater.check.mockResolvedValue({ available: true, downloaded: false });
  const root = await render();
  expect(shown(root)).toBe(false);
  await act(async () => DeviceEventEmitter.emit('InAppUpdate_downloaded'));
  expect(shown(root)).toBe(true);
  const restart = root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && n.findAll(c => c.props.children === 'Restart').length)[0];
  await act(async () => restart.props.onPress());
  expect(updater.install).toHaveBeenCalledTimes(1);
});

test('downloaded on an earlier open: offers Restart straight away, no second prompt', async () => {
  updater.check.mockResolvedValue({ available: false, downloaded: true });
  const root = await render();
  expect(shown(root)).toBe(true);
  expect(updater.start).not.toHaveBeenCalled();
});
