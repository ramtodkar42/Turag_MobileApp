/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SectionList } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Notifications from '../src/screens/notifications/Notifications/Notifications';
import { AppRefreshControl, Chip, SkeletonPulse } from '../src/components';
import { colors } from '../src/theme';
import { clearNotifications, getUnreadForTest } from '../src/store/notificationStore';
import { mapNotification, mapNotifications } from '../src/api/mappers/notification';
import { dayGroup, timeAgo } from '../src/utils/date';
import * as notificationApi from '../src/api/services/notification.api';

const MIN = 60 * 1000;
const ago = minutes => new Date(Date.now() - minutes * MIN).toISOString();

// Backend-shaped notifications (GET /notifications items).
const raw = () => [
  { id: 'n1', type: 'offer_received', title: 'New offer received', body: 'A buyer offered ₹8,40,000.', link: '/sell/l1', read: false, created_at: ago(5) },
  { id: 'n2', type: 'booking_assigned', title: 'Inspector assigned', body: 'An inspector is on the way.', link: '/account/bookings/b1', read: false, created_at: ago(30) },
  { id: 'n3', type: 'offer_countered', title: 'Counter-offer received', body: 'The seller countered.', link: '/buy/offers', read: true, created_at: ago(3 * 24 * 60) },
  { id: 'n4', type: 'report_ready', title: 'Your inspection report is ready', body: 'Ready to view.', link: null, read: true, created_at: ago(20 * 24 * 60) },
];
const response = list => {
  const items = mapNotifications(list);
  return { items, unreadCount: items.filter(i => i.unread).length };
};

jest.mock('../src/api/services/notification.api', () => ({
  getNotifications: jest.fn(),
  markAllNotificationsRead: jest.fn(() => Promise.resolve(2)),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

let tree;

const render = async element => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return tree.root;
};

const nav = () => ({ navigate: jest.fn(), goBack: jest.fn() });
const hasText = (root, text) => root.findAll(n => n.props.children === text).length > 0;
// NotificationItem is memoised, so find it by its `item` prop.
const items = root => {
  const ids = new Set();
  return root
    .findAll(n => n.props.item?.id && n.props.item.title)
    .filter(n => !ids.has(n.props.item.id) && ids.add(n.props.item.id));
};
const titles = root => items(root).map(n => n.props.item.title);
const chip = (root, label) => root.findAllByType(Chip).find(c => c.props.label === label);
const pullToRefresh = async root => {
  await act(async () => root.findByType(AppRefreshControl).props.onRefresh());
};
const unmount = () => act(() => tree?.unmount());
// The test renderer doesn't scroll: report the rows now listed as on screen
// (as the real list does when they scroll into view).
const seeListed = root =>
  act(() =>
    root.findByType(SectionList).props.onViewableItemsChanged({
      viewableItems: items(root).map(n => ({ item: n.props.item })),
    }),
  );

beforeEach(() => {
  notificationApi.getNotifications.mockImplementation(() => Promise.resolve(response(raw())));
});

afterEach(() => {
  unmount();
  act(() => clearNotifications());
  jest.clearAllMocks();
});

describe('mapping the backend notification', () => {
  test('type decides the chip and icon; read/created_at become unread/createdAt', () => {
    const item = mapNotification(raw()[0]);
    expect(item).toEqual(
      expect.objectContaining({ id: 'n1', category: 'offers', icon: 'tag', unread: true, link: '/sell/l1' }),
    );
    expect(mapNotification(raw()[1])).toEqual(expect.objectContaining({ category: 'alerts', icon: 'user' }));
    expect(mapNotification(raw()[3])).toEqual(expect.objectContaining({ category: 'alerts', unread: false }));
  });

  test('chat types are Messages; unknown types still show as Alerts', () => {
    const base = { id: 'x', title: 't', body: 'b', link: null, read: false, created_at: ago(1) };
    expect(mapNotification({ ...base, type: 'chat_message' }).category).toBe('messages');
    expect(mapNotification({ ...base, type: 'something_new' })).toEqual(
      expect.objectContaining({ category: 'alerts', icon: 'bell' }),
    );
  });

  test('the list is newest first even if the server order is not', () => {
    const list = mapNotifications([raw()[3], raw()[0], raw()[2]]);
    expect(list.map(i => i.id)).toEqual(['n1', 'n3', 'n4']);
  });

  test('time labels and Today / This week / Earlier groups', () => {
    const now = new Date(2026, 9, 3, 15, 0).getTime(); // Sat 3 Oct, 3 PM
    expect(timeAgo(now - 20 * 1000, now)).toBe('Just now');
    expect(timeAgo(now - 5 * MIN, now)).toBe('5 min ago');
    expect(timeAgo(now - 3 * 60 * MIN, now)).toBe('3 hr ago');
    expect(timeAgo(new Date(2026, 9, 2, 20, 0).getTime(), now)).toBe('Yesterday');
    expect(timeAgo(new Date(2026, 8, 29, 9, 0).getTime(), now)).toBe('Tue');
    expect(timeAgo(new Date(2026, 8, 12, 9, 0).getTime(), now)).toBe('12 Sep');

    expect(dayGroup(now - 60 * MIN, now)).toBe('today');
    expect(dayGroup(new Date(2026, 8, 28, 9, 0).getTime(), now)).toBe('week');
    expect(dayGroup(new Date(2026, 8, 20, 9, 0).getTime(), now)).toBe('earlier');
  });
});

describe('Notifications page', () => {
  test('first visit shows grey placeholder rows, then the list', async () => {
    let resolve;
    notificationApi.getNotifications.mockImplementationOnce(() => new Promise(r => (resolve = r)));
    const root = await render(<Notifications navigation={nav()} />);

    expect(root.findAllByType(SkeletonPulse)).toHaveLength(1);
    await act(async () => resolve(response(raw())));

    expect(root.findAllByType(SkeletonPulse)).toHaveLength(0);
    expect(titles(root)).toEqual([
      'New offer received',
      'Inspector assigned',
      'Counter-offer received',
      'Your inspection report is ready',
    ]);
  });

  test('groups into Today / This week / Earlier with "x min ago" times', async () => {
    const root = await render(<Notifications navigation={nav()} />);

    expect(hasText(root, 'Today')).toBe(true);
    expect(hasText(root, 'This week')).toBe(true);
    expect(hasText(root, 'Earlier')).toBe(true);
    expect(items(root)[0].props.item.time).toBe('5 min ago');
    expect(root.findAllByType(Chip).map(c => c.props.label)).toEqual(['All', 'Offers', 'Messages', 'Alerts']);
  });

  test('chips filter by category, with a friendly empty message', async () => {
    const root = await render(<Notifications navigation={nav()} />);

    await act(async () => chip(root, 'Offers').props.onPress());
    expect(titles(root)).toEqual(['New offer received', 'Counter-offer received']);

    await act(async () => chip(root, 'Alerts').props.onPress());
    expect(titles(root)).toEqual(['Inspector assigned', 'Your inspection report is ready']);

    await act(async () => chip(root, 'Messages').props.onPress());
    expect(titles(root)).toHaveLength(0);
    expect(hasText(root, 'No messages yet')).toBe(true);
  });

  test('unread items show a dot until the page is left; then the backend is told', async () => {
    const root = await render(<Notifications navigation={nav()} />);
    expect(items(root).filter(n => n.props.item.unread)).toHaveLength(2);
    seeListed(root);
    expect(notificationApi.markAllNotificationsRead).not.toHaveBeenCalled();

    unmount();
    expect(getUnreadForTest()).toBe(0);
    expect(notificationApi.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  test("only what was on screen is marked read: other chips' unread keep their dots", async () => {
    const root = await render(<Notifications navigation={nav()} />);
    await act(async () => chip(root, 'Offers').props.onPress());
    seeListed(root); // only the offers were on screen
    unmount();
    // The offer (n1) is read; the unseen alert (n2) still has its dot, and the
    // server (which can only mark everything) isn't told yet.
    expect(getUnreadForTest()).toBe(1);
    expect(notificationApi.markAllNotificationsRead).not.toHaveBeenCalled();

    // Next visit: the alert is seen too -> nothing unseen left -> server told.
    const again = await render(<Notifications navigation={nav()} />);
    await act(async () => chip(again, 'Alerts').props.onPress());
    seeListed(again);
    unmount();
    expect(getUnreadForTest()).toBe(0);
    expect(notificationApi.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  test('opened and left before anything showed: nothing is marked read', async () => {
    await render(<Notifications navigation={nav()} />);
    unmount();
    expect(getUnreadForTest()).toBe(2);
    expect(notificationApi.markAllNotificationsRead).not.toHaveBeenCalled();
  });

  test('nothing unread: leaving does not call the backend', async () => {
    notificationApi.getNotifications.mockImplementation(() =>
      Promise.resolve(response(raw().map(n => ({ ...n, read: true })))),
    );
    await render(<Notifications navigation={nav()} />);
    unmount();
    expect(notificationApi.markAllNotificationsRead).not.toHaveBeenCalled();
  });

  test('a refresh that still says "unread" does not bring the dots back', async () => {
    seeListed(await render(<Notifications navigation={nav()} />));
    unmount(); // marks n1, n2 read

    const root = await render(<Notifications navigation={nav()} />);
    await pullToRefresh(root); // server copy still unread (answer raced the mark-read)
    expect(items(root).filter(n => n.props.item.unread)).toHaveLength(0);
  });

  test('coming back opens instantly from the kept list (no placeholders, no reload)', async () => {
    await render(<Notifications navigation={nav()} />);
    unmount();
    expect(notificationApi.getNotifications).toHaveBeenCalledTimes(1);

    act(() => {
      tree = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <Notifications navigation={nav()} />
        </SafeAreaProvider>,
      );
    });
    const root = tree.root;
    expect(root.findAllByType(SkeletonPulse)).toHaveLength(0);
    expect(titles(root)).toHaveLength(4);
    expect(notificationApi.getNotifications).toHaveBeenCalledTimes(1);
  });

  test('pull to refresh adds a new notification at the top, fading in', async () => {
    const root = await render(<Notifications navigation={nav()} />);
    const fresh = { id: 'n9', type: 'offer_accepted', title: 'Offer accepted', body: 'Deal!', link: '/buy/offers', read: false, created_at: ago(0) };
    notificationApi.getNotifications.mockResolvedValueOnce(response([fresh, ...raw()]));

    await pullToRefresh(root);

    expect(titles(root)[0]).toBe('Offer accepted');
    expect(items(root)[0].props.item).toEqual(expect.objectContaining({ isNew: true, time: 'Just now' }));
    expect(items(root)[1].props.item.isNew).toBe(false);
  });

  test('a failed first load offers Try again', async () => {
    notificationApi.getNotifications.mockRejectedValueOnce(new Error("Can't reach Turag."));
    const root = await render(<Notifications navigation={nav()} />);
    expect(hasText(root, "Can't reach Turag.")).toBe(true);

    await act(async () => root.findAll(n => n.props.title === 'Try again' && n.props.onPress)[0].props.onPress());
    expect(titles(root)).toHaveLength(4);
  });

  test('pull-to-refresh uses the shared brand-red spinner', async () => {
    const root = await render(<Notifications navigation={nav()} />);
    const native = root.findAll(n => Array.isArray(n.props.colors) && n.props.onRefresh)[0];
    expect(native.props.colors).toEqual([colors.primary]);
    expect(native.props.progressBackgroundColor).toBe(colors.white);
  });
});

describe('like the web', () => {
  test('unread rows have the light red background; read rows do not', async () => {
    const root = await render(<Notifications navigation={nav()} />);
    const row = id =>
      root.findAll(n => n.props.accessible && n.props.style && n.props.accessibilityLabel?.includes(id))[0];
    // Tappable rows (Pressable) take a style function.
    const background = node => {
      const style = typeof node.props.style === 'function' ? node.props.style({ pressed: false }) : node.props.style;
      return [style].flat(Infinity).filter(Boolean).map(s => s.backgroundColor).filter(Boolean);
    };

    expect(background(row('New offer received'))).toContain(colors.unreadTint);
    expect(background(row('Your inspection report is ready'))).not.toContain(colors.unreadTint);
  });

  test('nothing yet: "You’re all caught up"', async () => {
    notificationApi.getNotifications.mockImplementation(() => Promise.resolve(response([])));
    const root = await render(<Notifications navigation={nav()} />);
    expect(hasText(root, 'You’re all caught up')).toBe(true);
    expect(
      hasText(root, 'We’ll notify you when an inspection is booked, assigned, or a report is ready.'),
    ).toBe(true);
  });

  test('the Home bell shows the unread count, 9+ for more', async () => {
    const HomeHeader = require('../src/screens/home/Home/components/HomeHeader').default;
    // The count (AppText renders it in more than one layer, so de-duplicate).
    const badge = root => [
      ...new Set(
        root
          .findAll(n => /^\d+\+?$/.test(String(n.props.children)))
          .map(n => n.props.children),
      ),
    ];
    // (The search button comes first in the header.)
    const bell = root =>
      root.findAll(n => n.props.accessibilityRole === 'button' && /^Notifications/.test(n.props.accessibilityLabel ?? ''))[0];

    let root = await render(<HomeHeader name="Raj" location="Pune" onNotificationsPress={jest.fn()} unreadCount={0} />);
    expect(badge(root)).toEqual([]);
    expect(bell(root).props.accessibilityLabel).toBe('Notifications');
    unmount();

    root = await render(<HomeHeader name="Raj" location="Pune" onNotificationsPress={jest.fn()} unreadCount={3} />);
    expect(badge(root)).toEqual([3]);
    expect(bell(root).props.accessibilityLabel).toBe('Notifications, 3 unread');
    unmount();

    root = await render(<HomeHeader name="Raj" location="Pune" onNotificationsPress={jest.fn()} unreadCount={14} />);
    expect(badge(root)).toEqual(['9+']);
  });
});

test('tapping a notification opens its page; links without an app page are not tappable', async () => {
  notificationApi.getNotifications.mockImplementation(() =>
    Promise.resolve(
      response([
        ...raw(),
        { id: 'n5', type: 'system_notice', title: 'New policy', body: 'Read it on the web.', link: '/legal/terms', read: true, created_at: ago(40) },
      ]),
    ),
  );
  const navigation = nav();
  const root = await render(<Notifications navigation={navigation} />);
  // The NotificationItem element (it has the onPress prop, even when undefined).
  const row = id => root.findAll(n => n.props.item?.id === id && 'onPress' in n.props)[0];

  await act(async () => row('n1').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('MyListing', { listingId: 'l1' });
  await act(async () => row('n2').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('BookingDetails', { bookingId: 'b1' });
  await act(async () => row('n3').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('MyOffers', {});
  expect(row('n4').props.onPress).toBeUndefined(); // no link
  expect(row('n5').props.onPress).toBeUndefined(); // no app page for it
});
