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

const listeners = {};
let tree;
beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Keyboard, 'addListener').mockImplementation((name, fn) => {
    listeners[name] = fn;
    return { remove: jest.fn() };
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
  act(() => tree.unmount());
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
