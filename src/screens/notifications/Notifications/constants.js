// Filter chips; `value` matches a notification's `category` (null = everything).
// `emptyKey`: i18n prefix of what the page says when that chip has nothing
// (`<emptyKey>.title` / `<emptyKey>.message`).
export const FILTERS = [
  {
    id: 'all',
    labelKey: 'notifications.filter.all',
    value: null,
    emptyKey: 'notifications.empty.all',
  },
  {
    id: 'offers',
    labelKey: 'notifications.filter.offers',
    value: 'offers',
    emptyKey: 'notifications.empty.offers',
  },
  {
    id: 'messages',
    labelKey: 'notifications.filter.messages',
    value: 'messages',
    emptyKey: 'notifications.empty.messages',
  },
  {
    id: 'alerts',
    labelKey: 'notifications.filter.alerts',
    value: 'alerts',
    emptyKey: 'notifications.empty.alerts',
  },
];

// List sections, in order; `key` matches dayGroup() (utils/date.js).
export const SECTIONS = [
  { key: 'today', titleKey: 'notifications.section.today' },
  { key: 'week', titleKey: 'notifications.section.week' },
  { key: 'earlier', titleKey: 'notifications.section.earlier' },
];
