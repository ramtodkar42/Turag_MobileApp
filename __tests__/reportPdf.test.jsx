/**
 * Download PDF while the backend's worker is still making it (GENERATING): the screen
 * says "Preparing your report…" and keeps asking for up to 3 minutes, as the backend
 * team asked, instead of failing; a network blip while waiting is tried again.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import * as reportApi from '../src/api/services/report.api';
import { ApiError } from '../src/api/client';
import useReportActions from '../src/screens/account/InspectionReport/useReportActions';

let actions;
function Harness() {
  actions = useReportActions({ inspectionId: 'insp_1', title: 'Honda City' });
  return null;
}

let tree;
beforeEach(async () => {
  jest.useFakeTimers();
  await act(async () => {
    tree = ReactTestRenderer.create(<Harness />);
  });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const generating = { status: 'GENERATING', url: null, reason: null };
const ready = { status: 'READY', url: 'https://cdn.turag.ai/r.pdf', reason: null };
const blip = () => new ApiError({ code: 'NETWORK_ERROR', message: 'No internet connection.' });

const start = () => {
  let done;
  act(() => {
    done = actions.download();
  });
  return done;
};

test('still preparing after a minute: keeps waiting and opens it when it is ready', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  let calls = 0;
  jest.spyOn(reportApi, 'getReportPdf').mockImplementation(async () => {
    calls += 1;
    return calls < 20 ? generating : ready; // about 90 s of "preparing"
  });
  const done = start();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(30000);
  });
  expect(actions.message).toEqual({ text: 'Preparing your report…', tone: 'info' });
  expect(actions.downloading).toBe(true);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(70000);
    await done;
  });
  expect(open).toHaveBeenCalledWith('https://cdn.turag.ai/r.pdf');
  expect(actions.message).toBeNull();
  expect(actions.downloading).toBe(false);
});

test('a network blip while waiting is tried again, not shown as a failure', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest
    .spyOn(reportApi, 'getReportPdf')
    .mockResolvedValueOnce(generating)
    .mockRejectedValueOnce(blip())
    .mockResolvedValueOnce(ready);
  const done = start();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(10000);
    await done;
  });
  expect(open).toHaveBeenCalledWith('https://cdn.turag.ai/r.pdf');
  expect(actions.message).toBeNull();
});

test('still not ready after 3 minutes: a friendly "still being prepared", not an error', async () => {
  const api = jest.spyOn(reportApi, 'getReportPdf').mockResolvedValue(generating);
  const done = start();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3 * 60000 + 10000);
    await done;
  });
  expect(actions.message).toEqual({
    text: 'Your report is still being prepared. Please tap Download PDF again in a minute.',
    tone: 'info',
  });
  expect(actions.downloading).toBe(false);
  // Every 3 s for the first 30 s, then every 6 s: about 36 checks, not a tight loop.
  expect(api.mock.calls.length).toBeGreaterThan(30);
  expect(api.mock.calls.length).toBeLessThan(45);
});

test('three network problems in a row end the wait with the error', async () => {
  jest.spyOn(reportApi, 'getReportPdf').mockRejectedValue(blip());
  const done = start();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(20000);
    await done;
  });
  expect(actions.message).toEqual({ text: 'No internet connection.', tone: 'error' });
});

test('the PDF is not available: says so straight away', async () => {
  const api = jest.spyOn(reportApi, 'getReportPdf').mockResolvedValue({ status: 'NOT_AVAILABLE', url: null, reason: null });
  const done = start();
  await act(async () => {
    await done;
  });
  expect(api).toHaveBeenCalledTimes(1);
  expect(actions.message).toEqual({
    text: 'The PDF isn’t available right now. Please try again later.',
    tone: 'error',
  });
});
