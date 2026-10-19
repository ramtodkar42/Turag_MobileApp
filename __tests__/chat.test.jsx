/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import ChatSplash from '../src/screens/chat/ChatSplash/ChatSplash';
import Chat from '../src/screens/chat/Chat/Chat';
import SuggestionPill from '../src/screens/chat/Chat/components/SuggestionPill';
import TypingIndicator from '../src/screens/chat/Chat/components/TypingIndicator';
import ChatInput from '../src/screens/chat/Chat/components/ChatInput';
import { ROUTES } from '../src/navigation/routes';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;

// UserMessage / BotMessage are memo() components, so find them by their `message` prop.
const messages = (root, role) =>
  root
    .findAll(n => n.props.message?.role === role && typeof n.type !== 'string')
    .map(n => n.props.message.text)
    .filter((text, i, all) => all.indexOf(text) === i);

const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};

const advance = async ms => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => jest.useFakeTimers());

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

test('Chat splash opens the chat after 2 seconds', async () => {
  const navigation = { replace: jest.fn() };
  await render(<ChatSplash navigation={navigation} />);

  await advance(1900);
  expect(navigation.replace).not.toHaveBeenCalled();
  await advance(200);
  expect(navigation.replace).toHaveBeenCalledWith(ROUTES.CHAT);
});

test('Tapping a suggestion sends it, shows typing, then the reply', async () => {
  const root = await render(<Chat navigation={{ goBack: jest.fn() }} />);

  const suggestion = root
    .findAllByType(SuggestionPill)
    .find(p => p.props.text === 'Compare two vehicles.');
  // Don't await the reply here: it resolves on a (fake) timer we advance below.
  await act(async () => {
    suggestion.props.onPress(suggestion.props.text);
  });

  expect(messages(root, 'user')[0]).toBe('Compare two vehicles.');
  expect(root.findAllByType(TypingIndicator)).toHaveLength(1);

  await advance(1300);

  expect(root.findAllByType(TypingIndicator)).toHaveLength(0);
  expect(messages(root, 'bot')[0]).toMatch(/compare/i);
});

test('Typed message is sent and the field clears', async () => {
  const root = await render(<Chat navigation={{ goBack: jest.fn() }} />);
  const input = () => root.findByType(ChatInput);

  await act(async () => input().props.onChangeText('Hello'));
  await act(async () => input().props.onSend());

  expect(input().props.value).toBe('');
  expect(messages(root, 'user')[0]).toBe('Hello');
});

test('Copy puts the bot reply on the clipboard', async () => {
  const root = await render(<Chat navigation={{ goBack: jest.fn() }} />);
  const input = () => root.findByType(ChatInput);

  await act(async () => input().props.onChangeText('Hello'));
  await act(async () => input().props.onSend());
  await advance(1300);

  const copy = root.findAll(n => n.props.accessibilityLabel === 'Copy' && n.props.onPress)[0];
  await act(async () => copy.props.onPress());

  expect(Clipboard.setString).toHaveBeenCalledWith(expect.stringMatching(/Hello/));
});

test('Chat splash is reachable through the real navigator', async () => {
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
