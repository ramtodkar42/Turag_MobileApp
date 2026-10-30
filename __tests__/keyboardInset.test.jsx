/**
 * Android keyboard: the content is padded by exactly what the keyboard covers -
 * the whole keyboard (+ the navigation bar under it) on Android 15+ edge-to-edge,
 * where the screen isn't shrunk, and nothing extra where the phone already
 * shrank it.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Keyboard, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useKeyboardInset from '../src/hooks/useKeyboardInset';

const metrics = { frame: { x: 0, y: 0, width: 400, height: 900 }, insets: { top: 30, left: 0, right: 0, bottom: 48 } };

let result;
function Probe() {
  result = useKeyboardInset();
  return null;
}

// Every listener of a keyboard event (several hooks listen to the same one).
const listeners = {};
const subscribed = {};
let tree;
beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  Object.keys(subscribed).forEach(name => delete subscribed[name]);
  jest.spyOn(Keyboard, 'addListener').mockImplementation((name, fn) => {
    (subscribed[name] ??= new Set()).add(fn);
    listeners[name] = event => [...subscribed[name]].forEach(f => f(event));
    return { remove: () => subscribed[name].delete(fn) };
  });
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <Probe />
      </SafeAreaProvider>,
    );
  });
});
afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
  jest.restoreAllMocks();
});

const layout = height => act(() => result.onLayout({ nativeEvent: { layout: { height } } }));
const show = height => act(() => listeners.keyboardDidShow({ endCoordinates: { height, screenY: 9999 } }));
const hide = () => act(() => listeners.keyboardDidHide({}));

test('Android 15+ (screen not shrunk): pads by the keyboard + the navigation bar, back to 0 on hide', () => {
  layout(900);
  expect(result.bottom).toBe(0);
  show(300);
  expect(result.open).toBe(true);
  expect(result.bottom).toBe(348);
  hide();
  expect(result.bottom).toBe(0);
  expect(result.open).toBe(false);
});

test('older phone (screen shrunk by the system): nothing added twice, even if it shrinks first', () => {
  layout(900);
  layout(552); // the system shrank it just before the keyboard event
  show(300);
  expect(result.bottom).toBe(0);
  hide();
  layout(900);
  expect(result.bottom).toBe(0);
});

test('partly shrunk: only the part still covered', () => {
  layout(900);
  show(300);
  layout(800);
  expect(result.bottom).toBe(248);
});

describe('ScreenContainer and the focused field', () => {
  const { TextInput, LayoutAnimation } = require('react-native');
  const ScreenContainer = require('../src/components/layout/ScreenContainer').default;

  // Opens the keyboard over a screen whose field is measured as covered, and
  // reports whether the screen scrolled by itself.
  const scrolledWith = async props => {
    // Only the screen listens to the keyboard here (not the hook probe above).
    act(() => tree?.unmount());
    tree = null;
    jest.useFakeTimers();
    const scrollTo = jest.fn();
    // The screen's own scroll view: its position on screen, and its scrolling.
    const scrollRef = node => {
      if (!node) return;
      node.getNativeScrollRef = undefined;
      node.measureInWindow = cb => cb(0, 0, 400, 400);
      node.scrollTo = scrollTo;
    };
    const field = { measureInWindow: cb => cb(0, 500, 300, 50) };
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(field);
    let screen;
    await act(async () => {
      screen = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <ScreenContainer scroll scrollRef={scrollRef} {...props} />
        </SafeAreaProvider>,
      );
    });
    await act(async () => listeners.keyboardDidShow({ endCoordinates: { height: 300 } }));
    await act(async () => jest.advanceTimersByTime(500));
    act(() => screen.unmount());
    jest.useRealTimers();
    return scrollTo.mock.calls.length > 0;
  };

  test('other screens (default): a covered field is still scrolled into view', async () => {
    expect(await scrolledWith({})).toBe(true);
  });

  // Whether the screen makes room for the keyboard (here the screen was loaded
  // for iOS, where KeyboardAvoidingView makes it; Android pads by the same switch).
  const makesKeyboardRoom = async props => {
    act(() => tree?.unmount());
    tree = null;
    const { KeyboardAvoidingView } = require('react-native');
    let screen;
    await act(async () => {
      screen = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <ScreenContainer scroll {...props} />
        </SafeAreaProvider>,
      );
    });
    const room = screen.root.findAllByType(KeyboardAvoidingView).length > 0;
    act(() => screen.unmount());
    return room;
  };

  test('other screens make room for the keyboard; Login (keyboardRoom off) makes none', async () => {
    expect(await makesKeyboardRoom({})).toBe(true);
    expect(await makesKeyboardRoom({ keyboardRoom: false })).toBe(false);
  });

  test('Login (followFocus off): opening the keyboard never scrolls the content up', async () => {
    const animate = jest.spyOn(LayoutAnimation, 'configureNext');
    expect(await scrolledWith({ followFocus: false, animateKeyboard: false })).toBe(false);
    expect(animate).not.toHaveBeenCalled(); // and no layout animation either
  });
});
