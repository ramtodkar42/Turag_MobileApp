// Backend notification (GET /notifications item) -> the shape the Notifications
// page uses. The backend only sends `type`; the filter chip (category) and icon
// are worked out here, so a new backend type still shows (as an Alert).

// type -> { category: 'offers' | 'messages' | 'alerts', icon }
const TYPES = {
  offer_received: { category: 'offers', icon: 'tag' },
  offer_accepted: { category: 'offers', icon: 'check' },
  offer_countered: { category: 'offers', icon: 'rupee' },
  offer_declined: { category: 'offers', icon: 'close' },
  offer_withdrawn: { category: 'offers', icon: 'close' },
  order_handed_over: { category: 'offers', icon: 'car' },
  order_cancelled: { category: 'offers', icon: 'close' },
  booking_confirmed: { category: 'alerts', icon: 'calendar' },
  booking_assigned: { category: 'alerts', icon: 'user' },
  booking_cancelled: { category: 'alerts', icon: 'close' },
  report_ready: { category: 'alerts', icon: 'shieldCheck' },
};

const DEFAULT_TYPE = { category: 'alerts', icon: 'bell' };

const describe = type => {
  if (TYPES[type]) {
    return TYPES[type];
  }
  // Chat / message events (e.g. "chat_message", "message_received").
  if (/chat|message/.test(type ?? '')) {
    return { category: 'messages', icon: 'message' };
  }
  return DEFAULT_TYPE;
};

// { id, type, category, icon, title, body, link, unread, createdAt (ms) }
export const mapNotification = item => {
  const { category, icon } = describe(item.type);
  const createdAt = Date.parse(item.created_at);
  return {
    id: item.id,
    type: item.type,
    category,
    icon,
    title: item.title,
    body: item.body,
    link: item.link ?? null,
    unread: !item.read,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
  };
};

// Newest first, whatever order the server used.
export const mapNotifications = items =>
  (items ?? []).map(mapNotification).sort((a, b) => b.createdAt - a.createdAt);
