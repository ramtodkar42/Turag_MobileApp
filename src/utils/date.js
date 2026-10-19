import { tNow } from '../i18n';

const pad = n => String(n).padStart(2, '0');

// Date -> "2026-10-25" (local time, no timezone shift)
export const toIsoDate = date =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Short month / weekday names in the current language.
const month = index => tNow(`common.month.${index}`);
const weekday = index => tNow(`common.day.${index}`);

// ISO date-time -> "Today, 10:30" / "Tomorrow, 09:00" / "12 Oct, 16:45"
export const formatSlot = (iso, now = new Date()) => {
  const date = new Date(iso);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  let day = `${date.getDate()} ${month(date.getMonth())}`;
  if (toIsoDate(date) === toIsoDate(now)) {
    day = tNow('common.date.today');
  } else if (toIsoDate(date) === toIsoDate(tomorrow)) {
    day = tNow('common.date.tomorrow');
  }
  return `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Dates on a receipt, in the app language and India time (as the web's):
//   inspection: "Friday, 09 October at 12:00 pm"   paid: "8 Oct 2026, 9:47 pm"
const LOCALES = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
const IST = 'Asia/Kolkata';

export const formatLongSlot = (time, language = 'en') =>
  new Date(time).toLocaleString(LOCALES[language] ?? 'en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST,
  });

// Explicit fields (not dateStyle / timeStyle) so every JS engine on the phone
// formats it the same way.
export const formatDateTime = (time, language = 'en') =>
  new Date(time).toLocaleString(LOCALES[language] ?? 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: IST,
  });

// A booking's day and time on their own rows (India time):
//   formatSlotDate: "25/10/2026"   formatSlotTime: "12:30 pm"
export const formatSlotDate = time =>
  new Date(time).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: IST,
  });

export const formatSlotTime = (time, language = 'en') =>
  new Date(time).toLocaleTimeString(LOCALES[language] ?? 'en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: IST,
  });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// Timestamp (ms) -> "Just now" / "5 min ago" / "2 hr ago" (today) / "Yesterday" /
// "Mon" (this week) / "12 Sep" (older). For notification lists.
export const timeAgo = (time, now = Date.now()) => {
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) {
    return tNow('common.date.justNow');
  }
  const today = startOfDay(new Date(now));
  if (time >= today) {
    return diff < HOUR
      ? tNow('common.date.minAgo', { count: Math.floor(diff / MINUTE) })
      : tNow('common.date.hrAgo', { count: Math.floor(diff / HOUR) });
  }
  const date = new Date(time);
  if (time >= today - DAY) {
    return tNow('common.date.yesterday');
  }
  if (time >= today - 6 * DAY) {
    return weekday(date.getDay());
  }
  return `${date.getDate()} ${month(date.getMonth())}`;
};

// Timestamp (ms) -> 'today' | 'week' (the last 7 days) | 'earlier'.
export const dayGroup = (time, now = Date.now()) => {
  const today = startOfDay(new Date(now));
  if (time >= today) {
    return 'today';
  }
  return time >= today - 6 * DAY ? 'week' : 'earlier';
};
