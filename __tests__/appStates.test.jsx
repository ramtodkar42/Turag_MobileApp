/**
 * App-wide states: a slow connection (top bar), a permission turned off
 * (Open Settings dialog) and notifications off (card on Notifications).
 * The session running out (Login says why) is in authFlow.test.jsx.
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import OfflineBanner from '../src/components/feedback/OfflineBanner';
import PermissionDialog from '../src/components/feedback/PermissionDialog';
import NotificationsOffCard from '../src/screens/notifications/Notifications/components/NotificationsOffCard';
import usePushPermission from '../src/hooks/usePushPermission';
import * as networkStore from '../src/store/networkStore';
import { hidePermissionOff } from '../src/store/permissionStore';
import { askAndroidPermission } from '../src/utils/permissions';
import { ensureCameraPermission } from '../src/utils/pickVideo';
import { request } from '../src/api/client';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;
const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>);
  });
  return tree.root;
};
const hasText = (root, text) => root.findAll(n => n.props.children === text).length > 0;

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  act(() => hidePermissionOff());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('slow connection', () => {
  test('the top bar says so while a request is slow', async () => {
    const root = await render(<OfflineBanner />);
    expect(hasText(root, 'Slow connection, still trying…')).toBe(false);
    let done;
    act(() => {
      done = networkStore.markSlow();
    });
    expect(hasText(root, 'Slow connection, still trying…')).toBe(true);
    act(() => done());
    act(() => done()); // twice is harmless
  });

  test('a request still waiting after 8 s marks the connection slow, until it answers', async () => {
    jest.useFakeTimers();
    const done = jest.fn();
    const spy = jest.spyOn(networkStore, 'markSlow').mockReturnValue(done);
    let finish;
    const originalFetch = global.fetch;
    global.fetch = jest.fn(
      () =>
        new Promise(resolve => {
          finish = () =>
            resolve({ ok: true, status: 200, headers: { get: () => null }, text: () => Promise.resolve('{}') });
        }),
    );
    try {
      const pending = request('/x', { auth: false });
      await act(async () => jest.advanceTimersByTime(7900));
      expect(spy).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(200));
      expect(spy).toHaveBeenCalledTimes(1);
      finish();
      await act(async () => pending);
      expect(done).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('slow-by-nature calls (longer timeout, e.g. AI estimates) never mark it', async () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(networkStore, 'markSlow');
    let finish;
    const originalFetch = global.fetch;
    global.fetch = jest.fn(
      () =>
        new Promise(resolve => {
          finish = () =>
            resolve({ ok: true, status: 200, headers: { get: () => null }, text: () => Promise.resolve('{}') });
        }),
    );
    try {
      const pending = request('/estimate', { auth: false, timeoutMs: 45000 });
      await act(async () => jest.advanceTimersByTime(20000));
      expect(spy).not.toHaveBeenCalled();
      finish();
      await act(async () => pending);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('permission turned off', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });

  test('"Don\'t ask again": the dialog explains it and opens Settings', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
    const root = await render(<PermissionDialog />);
    let granted;
    await act(async () => {
      granted = await ensureCameraPermission();
    });
    expect(granted).toBe(false);
    expect(hasText(root, 'Camera access is off')).toBe(true);
    const settings = root.findAll(n => n.props.title === 'Open Settings' && n.props.onPress)[0];
    await act(async () => settings.props.onPress());
    expect(open).toHaveBeenCalled();
    expect(root.findAll(n => n.props.visible === true)).toHaveLength(0);
  });

  test('a plain "Deny" can be asked again next time: no dialog', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    const root = await render(<PermissionDialog />);
    await act(async () => {
      await askAndroidPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, 'microphone');
    });
    expect(hasText(root, 'Microphone access is off')).toBe(false);
  });

  test('Not now closes it', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
    const root = await render(<PermissionDialog />);
    await act(async () => {
      await askAndroidPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, 'microphone');
    });
    expect(hasText(root, 'Microphone access is off')).toBe(true);
    const notNow = root.findAll(n => n.props.title === 'Not now' && n.props.onPress)[0];
    await act(async () => notNow.props.onPress());
    expect(root.findAll(n => n.props.visible === true)).toHaveLength(0);
  });
});

describe('notifications off', () => {
  const originalVersion = Platform.Version;
  beforeEach(() => {
    Platform.OS = 'android';
    Object.defineProperty(Platform, 'Version', { get: () => 34, configurable: true });
  });
  afterAll(() => {
    Object.defineProperty(Platform, 'Version', { get: () => originalVersion, configurable: true });
  });

  let off;
  function Probe() {
    off = usePushPermission();
    return null;
  }

  test('off on the phone: the hook says so; Turn on opens Settings', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    await render(<Probe />);
    expect(off).toBe(true);
    act(() => tree.unmount());

    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const root = await render(<NotificationsOffCard />);
    expect(hasText(root, 'Notifications are off')).toBe(true);
    await act(async () => root.findAll(n => n.props.title === 'Turn on' && n.props.onPress)[0].props.onPress());
    expect(open).toHaveBeenCalled();
  });

  test('allowed: nothing to show', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    await render(<Probe />);
    expect(off).toBe(false);
  });
});
