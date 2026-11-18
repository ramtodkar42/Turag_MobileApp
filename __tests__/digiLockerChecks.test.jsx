/**
 * DigiLocker: every status check is a paid provider call (₹2.50 + GST), so coming back
 * from DigiLocker checks at most twice, 4 s apart (as the web), and "Check again" runs
 * the same two.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import * as verificationApi from '../src/api/services/verification.api';
import useDigiLocker from '../src/screens/profile/DigiLocker/useDigiLocker';

let hook;
function Probe() {
  hook = useDigiLocker();
  return null;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('back from DigiLocker: two checks at most, then the result (still waiting here)', async () => {
  jest.spyOn(verificationApi, 'startDigiLocker').mockResolvedValue({ redirectUrl: 'https://digilocker.example/x' });
  const complete = jest.spyOn(verificationApi, 'completeDigiLocker').mockResolvedValue({ status: 'INITIATED' });
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {
    hook.onReturn();
  });
  await act(async () => jest.advanceTimersByTime(4000));
  await act(async () => jest.advanceTimersByTime(4000));
  await act(async () => jest.advanceTimersByTime(4000));
  expect(complete).toHaveBeenCalledTimes(2);
  expect(hook.phase).toBe('done');
  expect(hook.verification.status).toBe('INITIATED');
  act(() => tree.unmount());
});
