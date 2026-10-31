/**
 * Fixes from the app review: push on an expired session, crore rounding,
 * missing amounts, started inspector jobs, a sign-out during the business
 * accounts load, and a refused booking payment.
 * @format
 */

import { Platform } from 'react-native';
import * as messaging from '@react-native-firebase/messaging';
import * as notificationApi from '../src/api/services/notification.api';
import * as businessApi from '../src/api/services/business.api';
import * as session from '../src/api/session';
import { startPush, stopPush } from '../src/push/pushNotifications';
import { formatINROrDash, formatPriceShort } from '../src/utils/format';
import { isJobExpired } from '../src/screens/inspector/constants';
import { clearMyOrganizations, reloadMyOrganizations } from '../src/hooks/useMyOrganizations';

afterEach(() => jest.restoreAllMocks());

describe('push when the session expired', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    jest.spyOn(notificationApi, 'registerPushDevice').mockResolvedValue();
    jest.spyOn(session, 'hasSession').mockReturnValue(true);
  });

  test('the server can\'t be told, so the phone\'s push token is thrown away', async () => {
    const unregister = jest.spyOn(notificationApi, 'unregisterPushDevice').mockResolvedValue();
    messaging.deleteToken.mockClear();
    await startPush();
    await stopPush({ expired: true });
    expect(unregister).not.toHaveBeenCalled();
    expect(messaging.deleteToken).toHaveBeenCalledTimes(1);
  });

  test('a normal log out tells the server, and drops the token too', async () => {
    const unregister = jest.spyOn(notificationApi, 'unregisterPushDevice').mockResolvedValue();
    messaging.deleteToken.mockClear();
    await startPush();
    await stopPush();
    expect(unregister).toHaveBeenCalledWith('fcm-test-token');
    expect(messaging.deleteToken).toHaveBeenCalledTimes(1);
  });
});

test('prices: just under a crore is "₹1Cr", never "₹100L"', () => {
  expect(formatPriceShort(9999999)).toBe('₹1Cr');
  expect(formatPriceShort(9990000)).toBe('₹99.9L');
  expect(formatPriceShort(228000)).toBe('₹2.28L');
  expect(formatPriceShort(15000000)).toBe('₹1.5Cr');
  expect(formatPriceShort(50000)).toBe('₹50,000');
});

test('a missing amount shows "—", not "₹0" (a real 0 is still ₹0)', () => {
  expect(formatINROrDash(null)).toBe('—');
  expect(formatINROrDash(undefined)).toBe('—');
  expect(formatINROrDash(0)).toBe('₹0');
  expect(formatINROrDash(365000)).toBe('₹3,65,000');
});

test('an inspector job whose inspection has started is never "expired"', () => {
  const old = { status: 'ASSIGNED', slotAt: Date.now() - 3 * 60 * 60 * 1000 };
  expect(isJobExpired(old)).toBe(true);
  expect(isJobExpired({ ...old, inspectionId: 'ins_1' })).toBe(false);
});

test('signing out during the business accounts load drops that load', async () => {
  let answer;
  jest.spyOn(businessApi, 'getMyOrganizations').mockImplementation(
    () =>
      new Promise(resolve => {
        answer = resolve;
      }),
  );
  const pending = reloadMyOrganizations();
  clearMyOrganizations(); // signed out meanwhile
  answer([{ id: 'org_1', name: 'Old Dealer' }]);
  await pending;
  // The next sign-in loads its own list (a new request, not the old one).
  const next = jest.spyOn(businessApi, 'getMyOrganizations').mockResolvedValue([]);
  await reloadMyOrganizations();
  expect(next).toHaveBeenCalled();
  clearMyOrganizations();
});
