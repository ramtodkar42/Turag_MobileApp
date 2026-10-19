/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

// The native module (android/.../voice/VoiceSearchModule.kt), faked.
const native = {
  start: jest.fn(() => Promise.resolve(true)),
  stop: jest.fn(),
  cancel: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

// Installed before the hook loads (it reads the module once, at import).
NativeModules.VoiceSearch = native;
Platform.OS = 'android';
const useVoiceSearch = require('../src/hooks/useVoiceSearch').default;

let tree;
let voice;
const onPartial = jest.fn();
const onResult = jest.fn();

function Probe() {
  voice = useVoiceSearch({ onPartial, onResult });
  return null;
}

const emit = async (event, payload = {}) => {
  await act(async () => DeviceEventEmitter.emit(event, payload));
};

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  await act(async () => {
    tree = ReactTestRenderer.create(<Probe />);
  });
});

afterEach(() => {
  act(() => tree.unmount());
  jest.useRealTimers();
});

test('tap the mic: listens in the app language, fills words live, searches the final text', async () => {
  expect(voice.available).toBe(true);
  await act(async () => voice.toggle());
  expect(PermissionsAndroid.request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  expect(native.start).toHaveBeenCalledWith('en-IN');
  expect(voice.listening).toBe(true);

  await emit('VoiceSearch_level', { level: 0.6 });
  expect(voice.level).toBe(0.6);
  await emit('VoiceSearch_partial', { text: 'swift under' });
  expect(onPartial).toHaveBeenLastCalledWith('swift under');

  await emit('VoiceSearch_result', { text: 'swift under 5 lakh' });
  await emit('VoiceSearch_end');
  expect(onResult).toHaveBeenLastCalledWith('swift under 5 lakh');
  expect(voice.listening).toBe(false);
  expect(voice.level).toBe(0);
});

test('tap again while listening stops (what was said is still searched)', async () => {
  await act(async () => voice.toggle());
  await act(async () => voice.toggle());
  expect(native.stop).toHaveBeenCalled();
});

test('nothing heard / no permission: a short message, no search', async () => {
  jest.useFakeTimers();
  await act(async () => voice.toggle());
  await emit('VoiceSearch_error', { code: 'no_match' });
  await emit('VoiceSearch_end');
  expect(voice.hintKey).toBe('home.voice.noMatch');
  expect(onResult).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(4000));
  expect(voice.hintKey).toBeNull();

  PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);
  native.start.mockClear();
  await act(async () => voice.toggle());
  expect(native.start).not.toHaveBeenCalled();
  expect(voice.hintKey).toBe('home.voice.permission');
});

test('closing the search cancels listening; leaving the screen frees the mic', async () => {
  await act(async () => voice.toggle());
  await act(async () => voice.cancel());
  expect(native.cancel).toHaveBeenCalledTimes(1);
  expect(voice.listening).toBe(false);
  act(() => tree.unmount());
  expect(native.cancel).toHaveBeenCalledTimes(2);
  // afterEach unmounts again; keep it harmless.
  await act(async () => {
    tree = ReactTestRenderer.create(<Probe />);
  });
});

