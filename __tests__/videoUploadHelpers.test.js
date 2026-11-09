/**
 * @format
 */

import { scrollToView } from '../src/utils/scrollToView';
import { videoBitRate } from '../src/screens/selfInspection/VideoRecorder/videoBitRate';
import { ApiError } from '../src/api/client';
import { UPLOAD_REFUSED } from '../src/api/upload';
import { videoUploadErrorText } from '../src/screens/selfInspection/SelfInspection/videoUploadError';

describe('scrollToView: a view glides into view', () => {
  // As React Native's ScrollView ref: the content view itself, and its node number.
  const scrollView = () => {
    const content = { id: 'content' };
    return { content, current: { getInnerViewRef: () => content, getInnerViewNode: () => 42, scrollTo: jest.fn() } };
  };

  test('puts the view `gap` below the top, smoothly', () => {
    const ref = scrollView();
    const node = { measureLayout: jest.fn((host, done) => done(0, 640)) };
    scrollToView(ref, node, 12);
    expect(ref.current.scrollTo).toHaveBeenCalledWith({ y: 628, animated: true });
  });

  test('measured against the content view, never its node number (the new architecture ignores a number)', () => {
    const ref = scrollView();
    const node = { measureLayout: jest.fn() };
    scrollToView(ref, node, 12);
    expect(node.measureLayout).toHaveBeenCalledWith(ref.content, expect.any(Function), expect.any(Function));
    expect(node.measureLayout).not.toHaveBeenCalledWith(42, expect.anything(), expect.anything());
  });

  test('never above the top', () => {
    const ref = scrollView();
    scrollToView(ref, { measureLayout: (host, done) => done(0, 4) }, 12);
    expect(ref.current.scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  test('nothing to measure (no view yet, no scroll view): nothing happens', () => {
    const ref = scrollView();
    expect(() => scrollToView(ref, null, 12)).not.toThrow();
    expect(() => scrollToView({ current: null }, { measureLayout: jest.fn() }, 12)).not.toThrow();
    expect(() => scrollToView(undefined, { measureLayout: jest.fn() })).not.toThrow();
    expect(ref.current.scrollTo).not.toHaveBeenCalled();
  });
});

describe('videoBitRate: the longest clip stays small enough to send', () => {
  const megabytes = (bitRate, seconds) => ((bitRate + 192000) * seconds) / 8 / (1024 * 1024);

  test('the 2-minute walkaround is about 36 MB, well under the storage limit of 50 MB', () => {
    const rate = videoBitRate(120);
    expect(rate).toBeGreaterThan(2 * 1000 * 1000);
    expect(rate).toBeLessThan(2.5 * 1000 * 1000);
    expect(megabytes(rate, 120)).toBeLessThanOrEqual(36);
    // Even an encoder running 20% over its target stays under 50 MB.
    expect(megabytes(rate * 1.2, 120)).toBeLessThan(50);
  });

  test('a short clip (the engine start) keeps the full 4 Mbit/s; no length known: the full rate too', () => {
    expect(videoBitRate(45)).toBe(4 * 1000 * 1000);
    expect(videoBitRate(undefined)).toBe(4 * 1000 * 1000);
    expect(videoBitRate(0)).toBe(4 * 1000 * 1000);
  });

  test('never below a watchable rate', () => {
    expect(videoBitRate(10 * 60)).toBe(1500 * 1000);
  });
});

describe('videoUploadErrorText: a failed video upload in words the owner can act on', () => {
  const tryAgain = 'Please check your internet connection and tap "Try again". Your recording is still here.';

  test('a dropped connection, a slow one, a busy server or a refused upload: try again, the recording is kept', () => {
    expect(videoUploadErrorText(new ApiError({ code: 'NETWORK_ERROR', message: "Can't reach Turag." }))).toBe(tryAgain);
    expect(videoUploadErrorText(new ApiError({ code: 'TIMEOUT', message: 'Taking too long' }))).toBe(tryAgain);
    expect(videoUploadErrorText(new ApiError({ status: 503, message: 'Service Unavailable' }))).toBe(tryAgain);
    expect(videoUploadErrorText(new ApiError({ status: 403, code: UPLOAD_REFUSED, message: 'Upload failed.' }))).toBe(tryAgain);
  });

  test('too big for the storage: record it again', () => {
    expect(videoUploadErrorText(new ApiError({ status: 413, code: UPLOAD_REFUSED }))).toBe(
      'This video is too large to send. Please record it again.',
    );
  });

  test('anything else keeps its own message (an app update, an unreadable file, the server reason)', () => {
    const update = new ApiError({ code: 'APP_UPDATE_NEEDED', message: 'To upload videos, please update the app to the latest version.' });
    expect(videoUploadErrorText(update)).toBe('To upload videos, please update the app to the latest version.');
    expect(videoUploadErrorText(new ApiError({ status: 409, message: 'This inspection was already submitted.' }))).toBe(
      'This inspection was already submitted.',
    );
    expect(videoUploadErrorText(undefined)).toBe(tryAgain);
  });
});
