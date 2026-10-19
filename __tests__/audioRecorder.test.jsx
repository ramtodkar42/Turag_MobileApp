/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { createSound } from 'react-native-nitro-sound';
import { AudioRecorder, LevelBars, PulseDot } from '../src/components';

let tree;

const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree.root;
};

const press = async (root, label) => {
  const btn = root.find(n => n.props.accessibilityLabel === label && n.props.onPress);
  await act(async () => {
    await btn.props.onPress();
  });
};
const has = (root, label) => root.findAll(n => n.props.accessibilityLabel === label).length > 0;
const lastSound = () => createSound.mock.results[createSound.mock.results.length - 1].value;

afterEach(() => {
  act(() => tree?.unmount());
});

test('Record -> live timer and bars -> stop -> play / pause -> delete', async () => {
  const onRecorded = jest.fn();
  const root = await render(<AudioRecorder onRecorded={onRecorded} />);

  await press(root, 'Start recording');
  const sound = lastSound();
  expect(sound.startRecorder).toHaveBeenCalledWith(undefined, undefined, true); // metering on
  expect(root.findAllByType(PulseDot)).toHaveLength(1);

  await act(async () => sound.__emitRecord({ currentPosition: 12000, currentMetering: -20 }));
  expect(root.findAll(n => n.props.children === '00:12').length).toBeGreaterThan(0);
  expect(root.findByType(LevelBars).props.levels.length).toBe(1);

  await press(root, 'Stop recording');
  expect(onRecorded).toHaveBeenCalledWith({ uri: 'file:///tmp/note.m4a' });
  expect(has(root, 'Play')).toBe(true);

  await press(root, 'Play');
  expect(sound.startPlayer).toHaveBeenCalledWith('file:///tmp/note.m4a');
  await press(root, 'Pause');
  await press(root, 'Play');
  expect(sound.resumePlayer).toHaveBeenCalled(); // continues, doesn't restart
  expect(sound.startPlayer).toHaveBeenCalledTimes(1);

  await press(root, 'Delete recording');
  expect(has(root, 'Start recording')).toBe(true);
});

test('Recording stops by itself at the limit', async () => {
  const onRecorded = jest.fn();
  const root = await render(<AudioRecorder maxMs={30000} onRecorded={onRecorded} />);
  await press(root, 'Start recording');
  await act(async () => lastSound().__emitRecord({ currentPosition: 30000, currentMetering: -10 }));
  expect(lastSound().stopRecorder).toHaveBeenCalled();
  expect(onRecorded).toHaveBeenCalled();
});

test('Audio loader: unavailable when the native "Sound" object is not registered', () => {
  const { loadSoundLibrary } = require('../src/utils/audio');
  const lib = { createSound: () => ({}) };
  expect(loadSoundLibrary(() => lib, () => true)).toBe(lib);
  expect(loadSoundLibrary(() => lib, () => false)).toBeNull(); // app not rebuilt yet
  expect(
    loadSoundLibrary(() => {
      throw new Error('missing');
    }),
  ).toBeNull();
});

test('ConfirmDialog: two buttons, or a single OK button', async () => {
  const { ConfirmDialog, Button } = require('../src/components');
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  let root = await render(
    <ConfirmDialog
      visible
      title="Cancel Booking"
      message="Sure?"
      confirmLabel="Cancel Booking"
      cancelLabel="Keep Booking"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  const titles = () => root.findAllByType(Button).map(b => b.props.title);
  expect(titles()).toEqual(['Keep Booking', 'Cancel Booking']);
  await act(async () => root.findAllByType(Button)[0].props.onPress());
  expect(onCancel).toHaveBeenCalled();
  act(() => tree.unmount());

  root = await render(<ConfirmDialog visible title="Info" confirmLabel="OK" cancelLabel={null} />);
  expect(titles()).toEqual(['OK']);
});
