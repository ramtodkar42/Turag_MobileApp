/**
 * The TURAG.AI assistant = Turag's support chat (the web's support widget, the
 * Support Engine): the splash, then the chat page under the app's header -
 * help articles for guests, and the user's own pass when signed in.
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ChatSplash from '../src/screens/chat/ChatSplash/ChatSplash';
import Chat from '../src/screens/chat/Chat/Chat';
import { ROUTES } from '../src/navigation/routes';
import { SUPPORT_CHAT_URL, USE_REAL_API } from '../src/api/config';
import { endSession, startSession } from '../src/api/session';

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

const advance = async ms => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};
const hasText = (root, text) => root.findAll(n => n.props.children === text).length > 0;

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.useRealTimers();
});

test('Chat splash opens the chat after 2 seconds', async () => {
  jest.useFakeTimers();
  const navigation = { replace: jest.fn() };
  await render(<ChatSplash navigation={navigation} />);

  await advance(1900);
  expect(navigation.replace).not.toHaveBeenCalled();
  await advance(200);
  expect(navigation.replace).toHaveBeenCalledWith(ROUTES.CHAT);
});

describe('support chat', () => {
  let originalFetch;
  const authBefore = USE_REAL_API.auth;
  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    USE_REAL_API.auth = true;
  });
  afterEach(async () => {
    global.fetch = originalFetch;
    USE_REAL_API.auth = authBefore;
    await endSession();
  });

  test('a guest gets the help-articles chat, with a loader until it has drawn', async () => {
    const root = await render(<Chat navigation={{ goBack: jest.fn() }} />);
    const view = root.findByType(WebView);
    expect(view.props.source.uri).toBe(SUPPORT_CHAT_URL);
    expect(global.fetch).not.toHaveBeenCalled(); // no pass for a guest
    expect(hasText(root, 'Connecting you to Turag support…')).toBe(true);
    await act(async () => view.props.onLoadEnd());
    expect(hasText(root, 'Connecting you to Turag support…')).toBe(false);
  });

  test('signed in: the chat opens with the user’s own pass', async () => {
    await startSession({ accessToken: 'access-1', expiresIn: 900, refreshToken: 'refresh-1', user: {} });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve(JSON.stringify({ token: 'st.abc', request_id: 'r1' })),
    });
    const root = await render(<Chat navigation={{ goBack: jest.fn() }} />);
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/support-token$/);
    expect(root.findByType(WebView).props.source.uri).toBe(`${SUPPORT_CHAT_URL}&st=st.abc`);
  });

  test('links to other sites open outside; a failed load offers Retry', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    const root = await render(<Chat navigation={{ goBack: jest.fn() }} />);
    const onRequest = root.findByType(WebView).props.onShouldStartLoadWithRequest;
    expect(onRequest({ url: `${SUPPORT_CHAT_URL}#x`, isTopFrame: true })).toBe(true);
    expect(onRequest({ url: 'tel:18001234567', isTopFrame: true })).toBe(false);
    expect(open).toHaveBeenCalledWith('tel:18001234567');

    await act(async () => root.findByType(WebView).props.onError());
    expect(hasText(root, 'Couldn’t open the chat')).toBe(true);
    const retry = root.findAll(n => n.props.title === 'Try again' && n.props.onPress)[0];
    await act(async () => retry.props.onPress());
    expect(root.findAllByType(WebView)).toHaveLength(1);
    open.mockRestore();
  });
});

test('Chat splash is reachable through the real navigator', async () => {
  jest.useFakeTimers();
  const { NavigationContainer, createNavigationContainerRef } = require('@react-navigation/native');
  const RootNavigator = require('../src/navigation/RootNavigator').default;
  const navRef = createNavigationContainerRef();

  await render(
    <NavigationContainer ref={navRef}>
      <RootNavigator />
    </NavigationContainer>,
  );
  await act(async () => navRef.navigate(ROUTES.CHAT_SPLASH));
  expect(navRef.getCurrentRoute().name).toBe(ROUTES.CHAT_SPLASH);

  await advance(2100);
  expect(navRef.getCurrentRoute().name).toBe(ROUTES.CHAT);
});
