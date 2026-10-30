import createStore from './createStore';
import { getNotifications, markAllNotificationsRead } from '../api/services/notification.api';
import { showBanner } from '../push/bannerStore';
import { tNow } from '../i18n';

// Notifications, kept for the whole session (like Instagram): the first open
// loads them, later opens show the kept list at once and refresh quietly.
//   items       - newest first (see mappers/notification.js); items that arrived
//                 in the last refresh have `isNew` (they fade in)
//   loaded      - true once the first load finished
//   loading     - first load only (screen shows placeholder rows)
//   refreshing  - pull-to-refresh only (small spinner at the top)
//   error       - first load failed (later failures keep the old list)
const INITIAL = {
  items: [],
  loaded: false,
  loading: false,
  refreshing: false,
  error: '',
  fetchedAt: 0,
};

// Quiet refreshes closer together than this are skipped (pull-to-refresh isn't).
const STALE_AFTER_MS = 15000;

const store = createStore(INITIAL);

// Ids already marked read on this device, applied on top of every refresh so an
// answer that left before "mark read" reached the server can't bring dots back.
let seen = new Set();
let pending = null;
// Bumped on clear (log out) so a request still running can't refill the list.
let generation = 0;

const applySeen = item => (item.unread && seen.has(item.id) ? { ...item, unread: false } : item);

// A refresh asked for while a request was running (e.g. a push arrived): one
// more fetch once it ends, since that request started before the news.
let again = false;

// Loads or refreshes the list. Calls while a request is running share it.
// userRefresh: pull-to-refresh / a push arrived (always fetches).
// force: fetch now, quietly (no spinner).
export const loadNotifications = ({ userRefresh = false, force = false } = {}) => {
  if (pending) {
    if (userRefresh) {
      store.set(s => ({ ...s, refreshing: true }));
      again = true;
    }
    return pending;
  }
  const { loaded, fetchedAt } = store.get();
  if (loaded && !userRefresh && !force && Date.now() - fetchedAt < STALE_AFTER_MS) {
    return Promise.resolve();
  }

  store.set(s => ({ ...s, loading: !s.loaded, refreshing: userRefresh, error: '' }));
  const run = generation;
  pending = getNotifications()
    .then(({ items: fresh }) => {
      if (run !== generation) {
        return;
      }
      const prev = store.get();
      const known = new Set(prev.items.map(i => i.id));
      const items = fresh.map(item => ({
        ...applySeen(item),
        // New since this session's first load (not on the very first load, so
        // opening the app doesn't replay old notifications).
        isNew: prev.loaded && !known.has(item.id),
      }));
      store.set(s => ({ ...s, items, loaded: true, fetchedAt: Date.now() }));
      // A new notification just arrived: show the banner at the top (like the
      // web's popup). Items are newest first, so the first new unread one is
      // the latest; only one shows at a time.
      const arrived = items.find(i => i.isNew && i.unread);
      if (arrived) {
        showBanner({ title: arrived.title, body: arrived.body, link: arrived.link });
      }
    })
    .catch(e => {
      if (run !== generation) {
        return;
      }
      // Keep showing the old list if a refresh fails; only a first load errors.
      store.set(s => (s.loaded ? s : { ...s, error: e.message || tNow('notifications.error.load') }));
    })
    .finally(() => {
      if (run !== generation) {
        return;
      }
      pending = null;
      store.set(s => ({ ...s, loading: false, refreshing: false }));
      if (again) {
        again = false;
        loadNotifications({ force: true });
      }
    });
  return pending;
};

// Pull-to-refresh.
export const refreshNotifications = () => loadNotifications({ userRefresh: true });

// Leaving the page: everything shown has been seen. Clears the dots (and the
// bell dot) at once, and tells the backend in the background.
export const markNotificationsSeen = () => {
  const unread = store.get().items.filter(i => i.unread);
  if (unread.length === 0) {
    return;
  }
  unread.forEach(i => seen.add(i.id));
  store.set(s => ({ ...s, items: s.items.map(i => (i.unread ? { ...i, unread: false } : i)) }));
  markAllNotificationsRead().catch(() => {
    // Offline: the next visit marks them read on the server again.
    unread.forEach(i => seen.delete(i.id));
  });
};

export const useNotificationState = () => store.use();

// For the count on the Home bell (as the web's badge).
export const useUnreadCount = () => store.use(s => s.items.filter(i => i.unread).length);

// Tests only: how many items are unread right now.
export const getUnreadForTest = () => store.get().items.filter(i => i.unread).length;

export const clearNotifications = () => {
  generation += 1;
  seen = new Set();
  pending = null;
  again = false;
  store.set(INITIAL);
};
