/**
 * Push notifications: the phone is registered with the backend when signed in,
 * removed on log out, and a tapped push opens its page.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PushBanner from '../src/push/PushBanner';
import { BANNER_SHOW_MS } from '../src/components/feedback/InAppBanner';
import * as messaging from '@react-native-firebase/messaging';
import * as notificationApi from '../src/api/services/notification.api';
import * as session from '../src/api/session';
import { navigationRef } from '../src/navigation/navigationRef';
import { ROUTES } from '../src/navigation/routes';
import { clearNotifications, loadNotifications } from '../src/store/notificationStore';
import { openWaitingPush, startPush, stopPush } from '../src/push/pushNotifications';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let register;
let unregister;

beforeEach(() => {
  Platform.OS = 'ios';
  register = jest.spyOn(notificationApi, 'registerPushDevice').mockResolvedValue();
  unregister = jest.spyOn(notificationApi, 'unregisterPushDevice').mockResolvedValue();
  jest.spyOn(session, 'hasSession').mockReturnValue(true);
});

afterEach(async () => {
  await stopPush();
  jest.restoreAllMocks();
});

test('signed in: asks permission and registers this phone; a renewed token is registered again', async () => {
  await startPush();
  expect(messaging.requestPermission).toHaveBeenCalled();
  expect(register).toHaveBeenCalledWith('fcm-test-token', 'ios');

  await messaging.__emit('tokenRefresh', 'fcm-new-token');
  expect(register).toHaveBeenLastCalledWith('fcm-new-token', 'ios');

  // Starting again (the home tabs mount again) doesn't add listeners twice.
  register.mockClear();
  await startPush();
  expect(register).not.toHaveBeenCalled();
});

test('no permission: nothing is registered', async () => {
  messaging.requestPermission.mockResolvedValueOnce(messaging.AuthorizationStatus.DENIED);
  await startPush();
  expect(register).not.toHaveBeenCalled();
});

test('log out: this phone is removed from the backend', async () => {
  await startPush();
  await stopPush();
  expect(unregister).toHaveBeenCalledWith('fcm-test-token');
});

test('tapping a push opens its page (booking, offers, the seller listing)', async () => {
  const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
  jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
  await startPush();

  messaging.__emit('opened', { data: { type: 'booking_assigned', link: '/account/bookings/bkg_9' } });
  expect(navigate).toHaveBeenLastCalledWith(ROUTES.BOOKING_DETAILS, { bookingId: 'bkg_9' });

  messaging.__emit('opened', { data: { type: 'offer_accepted', link: '/buy/offers' } });
  expect(navigate).toHaveBeenLastCalledWith(ROUTES.MY_OFFERS, {});

  // A link the app has no page for: stays where it is.
  navigate.mockClear();
  messaging.__emit('opened', { data: { type: 'x', link: '/ops/inspectors' } });
  expect(navigate).not.toHaveBeenCalled();
});

// A new notification detected on a refresh is what raises the banner (the web
// shows its popup the same way). Drives the notification store directly.
const bannerText = tree =>
  tree.root
    .findAll(n => typeof n.type === 'string' && typeof n.props.children === 'string')
    .map(n => n.props.children);

const mountBannerWithNew = async () => {
  const base = [{ id: 'n1', title: 'Old', body: 'x', link: '/buy/offers', unread: false, createdAt: 1 }];
  const arrived = {
    id: 'n2',
    title: 'Inspector assigned',
    body: 'An inspector has been assigned.',
    link: '/account/bookings/bkg_7',
    unread: true,
    createdAt: 2,
  };
  jest
    .spyOn(notificationApi, 'getNotifications')
    .mockResolvedValueOnce({ items: base, unreadCount: 0 })
    .mockResolvedValue({ items: [arrived, ...base], unreadCount: 1 });
  clearNotifications();

  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <PushBanner />
      </SafeAreaProvider>,
    );
  });
  // First load: only old notifications, so no banner.
  await act(async () => loadNotifications());
  expect(bannerText(tree)).toEqual([]);
  // A refresh brings a new one: the banner pops at the top.
  await act(async () => loadNotifications({ userRefresh: true }));
  expect(bannerText(tree)).toEqual(expect.arrayContaining(['Inspector assigned', 'An inspector has been assigned.']));
  return tree;
};

test('a new notification while the app is open pops a banner; tapping it opens its page', async () => {
  const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
  jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);

  const tree = await mountBannerWithNew();
  await act(async () =>
    tree.root.findAll(n => n.props.accessibilityRole === 'alert' && n.props.onPress)[0].props.onPress(),
  );
  expect(navigate).toHaveBeenCalledWith(ROUTES.BOOKING_DETAILS, { bookingId: 'bkg_7' });

  act(() => tree.unmount());
});

test('the banner hides by itself after a few seconds', async () => {
  jest.useFakeTimers();
  const tree = await mountBannerWithNew();
  await act(async () => {
    jest.advanceTimersByTime(BANNER_SHOW_MS + 1000);
  });
  expect(bannerText(tree)).toEqual([]);
  act(() => tree.unmount());
  jest.useRealTimers();
});

test('a push arriving while the app is open refreshes the list (which raises the banner)', async () => {
  const get = jest.spyOn(notificationApi, 'getNotifications').mockResolvedValue({ items: [], unreadCount: 0 });
  clearNotifications();
  await startPush();
  get.mockClear();

  await act(async () => messaging.__emit('message', { notification: { title: 'x', body: 'y' }, data: {} }));
  expect(get).toHaveBeenCalled();
});

test('a push that launched the app opens its page once the home screen is ready', async () => {
  const navigate = jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {});
  jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
  messaging.getInitialNotification.mockResolvedValueOnce({ data: { link: '/account/bookings/bkg_1' } });

  await openWaitingPush();
  expect(navigate).toHaveBeenCalledWith(ROUTES.BOOKING_DETAILS, { bookingId: 'bkg_1' });
  // Only once per launch.
  navigate.mockClear();
  await openWaitingPush();
  expect(navigate).not.toHaveBeenCalled();
});
