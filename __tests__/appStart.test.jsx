/**
 * App start: the intro slides show only until they've been seen once; a
 * fresh install starts signed out (iOS keeps keychain items after uninstall).
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import useAppBoot from '../src/hooks/useAppBoot';
import Intro from '../src/screens/onboarding/Intro/Intro';
import { clearSession, loadSession, saveSession } from '../src/api/tokenStorage';
import { endSession } from '../src/api/session';
import { checkFreshInstall, hasSeenIntro } from '../src/utils/appPrefs';
import { ROUTES } from '../src/navigation/routes';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;
let boot;
function Probe() {
  boot = useAppBoot();
  return null;
}

// Opens the app and returns the first screen it picks.
const launch = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(<Probe />);
  });
  const route = boot.initialRoute;
  act(() => tree.unmount());
  return route;
};

const signedIn = { refreshToken: 'r', user: { role: 'individual', fullName: 'Asha' }, pending: null };

// What uninstalling does to the app's settings (same storage the app uses).
const wipeAppData = () => createAsyncStorage('turag-prefs').clear();

beforeEach(async () => {
  await wipeAppData();
  await clearSession();
  await endSession();
});

test('fresh install: intro; reopened without finishing it: intro again', async () => {
  expect(await launch()).toEqual({ name: ROUTES.INTRO });
  expect(await launch()).toEqual({ name: ROUTES.INTRO });
});

test('Skip / Get Started remembers the intro: the app then opens on Login', async () => {
  await launch(); // installed
  const navigation = { replace: jest.fn() };
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Intro navigation={navigation} />
      </SafeAreaProvider>,
    );
  });
  const skip = tree.root.findAll(n => n.props.accessibilityRole === 'button' && n.props.hitSlop)[0];
  await act(async () => skip.props.onPress());
  expect(navigation.replace).toHaveBeenCalledWith(ROUTES.LOGIN);
  act(() => tree.unmount());

  expect(await hasSeenIntro()).toBe(true);
  expect(await launch()).toEqual({ name: ROUTES.LOGIN });
});

test('signed in -> home; after logging out the app opens on Login, not the intro', async () => {
  await launch(); // installed, intro never shown (e.g. signed in before this was remembered)
  await saveSession(signedIn);
  expect(await launch()).toEqual({ name: ROUTES.MAIN_TABS });

  await clearSession(); // log out
  await endSession();
  expect(await launch()).toEqual({ name: ROUTES.LOGIN });
});

test('reinstall: a session left in the keychain is dropped and the intro shows again', async () => {
  await saveSession(signedIn); // survived the uninstall (iOS keychain)
  await wipeAppData(); // app data was wiped
  expect(await launch()).toEqual({ name: ROUTES.INTRO });
  expect(await loadSession()).toBeNull();
});

test('a normal launch never drops the session', async () => {
  await launch(); // installed
  await saveSession(signedIn);
  await launch();
  await launch();
  expect(await loadSession()).toEqual(signedIn);
  expect(await checkFreshInstall()).toBe(false);
});
