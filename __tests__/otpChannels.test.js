/**
 * Login's sign-in buttons (WhatsApp / SMS) are remembered on the phone and read at
 * app start, so Login never opens on "Get OTP" and then changes.
 */
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { getOtpChannels } from '../src/api/services/auth.api';
import {
  forgetOtpChannels,
  knownOtpChannels,
  loadOtpChannels,
  refreshOtpChannels,
  waitForOtpChannels,
} from '../src/store/otpChannels';

jest.mock('../src/api/services/auth.api', () => ({ getOtpChannels: jest.fn() }));

const prefs = createAsyncStorage('turag-prefs');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const never = () => new Promise(() => {});

// The next app start: nothing in memory, only what the phone saved.
const restart = () => forgetOtpChannels();

beforeEach(async () => {
  forgetOtpChannels();
  getOtpChannels.mockReset();
  await prefs.clear();
});

test("the server's answer is saved, and read back at the next start before the server answers", async () => {
  getOtpChannels.mockResolvedValueOnce(['whatsapp', 'sms']);
  expect(await refreshOtpChannels()).toEqual(['whatsapp', 'sms']);
  await flush();

  restart();
  getOtpChannels.mockReturnValueOnce(never());
  await loadOtpChannels();
  expect(knownOtpChannels()).toEqual(['whatsapp', 'sms']);
});

test('offline or no answer: the known buttons stay (no fall back to "Get OTP")', async () => {
  getOtpChannels.mockResolvedValueOnce(['whatsapp', 'sms']);
  await refreshOtpChannels();
  await flush();

  restart();
  getOtpChannels.mockResolvedValueOnce([]); // what a failed request returns
  await loadOtpChannels();
  expect(await refreshOtpChannels()).toEqual(['whatsapp', 'sms']);
  getOtpChannels.mockRejectedValueOnce(new Error('offline'));
  restart();
  await loadOtpChannels();
  await flush();
  expect(knownOtpChannels()).toEqual(['whatsapp', 'sms']);
});

test('the server changed its answer: the new one is used and saved', async () => {
  getOtpChannels.mockResolvedValueOnce(['whatsapp', 'sms']);
  await refreshOtpChannels();
  await flush();

  restart();
  getOtpChannels.mockResolvedValueOnce(['whatsapp']);
  await loadOtpChannels();
  await flush();
  expect(knownOtpChannels()).toEqual(['whatsapp']);
  restart();
  getOtpChannels.mockReturnValueOnce(never());
  await loadOtpChannels();
  expect(knownOtpChannels()).toEqual(['whatsapp']);
});

test('app start, then Login opening: the server is asked once', async () => {
  getOtpChannels.mockResolvedValue(['whatsapp', 'sms']);
  await loadOtpChannels();
  await flush();
  await refreshOtpChannels();
  expect(getOtpChannels).toHaveBeenCalledTimes(1);
});

test('first start with nothing saved: the splash waits for the answer, but never long', async () => {
  jest.useFakeTimers();
  getOtpChannels.mockReturnValueOnce(never());
  let done = false;
  waitForOtpChannels(2000).then(() => {
    done = true;
  });
  await Promise.resolve();
  expect(done).toBe(false);
  jest.advanceTimersByTime(2000);
  await Promise.resolve();
  expect(done).toBe(true);
  jest.useRealTimers();
});
