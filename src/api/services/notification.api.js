// Notifications API (bell on Home).
// Real backend when USE_REAL_API.notifications is true (src/api/config.js), mock otherwise.
import { request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { mapNotifications } from '../mappers/notification';
import { mockIncoming, mockNotifications } from '../mock/notifications';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const real = () => USE_REAL_API.notifications;

// MOCK: from the second call on, one new notification "arrives", so the
// quiet refresh / pull-to-refresh can be seen working.
let mockCalls = 0;

// The signed-in user's recent notifications (the newest 30), newest first.
// Returns { items, unreadCount }.
export const getNotifications = async () => {
  if (!real()) {
    await wait(500);
    mockCalls += 1;
    const raw = mockCalls > 1 ? [mockIncoming(), ...mockNotifications()] : mockNotifications();
    const items = mapNotifications(raw);
    return { items, unreadCount: items.filter(i => i.unread).length };
  }
  const data = await request(ENDPOINTS.NOTIFICATIONS);
  return { items: mapNotifications(data.items), unreadCount: data.unread_count ?? 0 };
};

// Push: registers (or refreshes) this phone's Firebase token for the signed-in
// user, so the backend can send pushes when the app is closed. Safe to repeat.
// platform: 'android' | 'ios'.
export const registerPushDevice = async (token, platform) => {
  if (!real()) {
    return;
  }
  await request(ENDPOINTS.NOTIFICATION_DEVICES, { method: 'POST', body: { token, platform } });
};

// Push: stops pushes to this phone (on log out). An unknown token is fine.
export const unregisterPushDevice = async token => {
  if (!real()) {
    return;
  }
  await request(ENDPOINTS.NOTIFICATION_DEVICES, { method: 'DELETE', body: { token } });
};

// Marks all of the user's notifications read. Returns how many were newly marked.
export const markAllNotificationsRead = async () => {
  if (!real()) {
    await wait(200);
    return 0;
  }
  const data = await request(ENDPOINTS.NOTIFICATIONS_READ, { method: 'POST' });
  return data?.marked ?? 0;
};
