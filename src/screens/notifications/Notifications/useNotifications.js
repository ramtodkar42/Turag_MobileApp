import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  loadNotifications,
  markNotificationsSeen,
  refreshNotifications,
  useNotificationState,
} from '../../../store/notificationStore';
import { dayGroup, timeAgo } from '../../../utils/date';
import { FILTERS, SECTIONS } from './constants';

// While the page is open, check for new notifications this often (quietly).
const POLL_MS = 30000;
// "5 min ago" labels are refreshed this often.
const CLOCK_MS = 60000;

// Notifications page data: the kept list (notificationStore) filtered by the
// chosen chip and grouped into Today / This week / Earlier, with "5 min ago"
// labels. Opening the page refreshes quietly; placeholders show only if nothing
// was loaded yet. Leaving the page marks read only the notifications that
// actually appeared on screen (any chip) - ones never shown (another chip, or
// further down than the user scrolled) keep their dots.
export default function useNotifications() {
  const state = useNotificationState();
  const [filterId, setFilter] = useState(FILTERS[0].id);
  const [now, setNow] = useState(() => Date.now());
  // Every notification that appeared on screen while the page was open.
  const shownIds = useRef(new Set());
  // The list's "now on screen" report (SectionList onViewableItemsChanged;
  // must keep the same identity, so it never changes).
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    viewableItems.forEach(({ item }) => item?.id && shownIds.current.add(item.id));
  }, []);

  useEffect(() => {
    const listed = shownIds.current; // the same Set, filled while the page is open
    loadNotifications();
    const poll = setInterval(loadNotifications, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), CLOCK_MS);
    const appState = AppState.addEventListener('change', next => {
      if (next === 'active') {
        setNow(Date.now());
        loadNotifications();
      }
    });
    return () => {
      clearInterval(poll);
      clearInterval(clock);
      appState.remove();
      // Unread dots stay while the page is open; leaving marks the ones shown read.
      markNotificationsSeen([...listed]);
    };
  }, []);

  // New data arrived: update the time labels too.
  useEffect(() => {
    setNow(Date.now());
  }, [state.fetchedAt]);

  const filter = FILTERS.find(f => f.id === filterId) ?? FILTERS[0];

  const sections = useMemo(() => {
    const shown = filter.value
      ? state.items.filter(item => item.category === filter.value)
      : state.items;
    const groups = {};
    shown.forEach(item => {
      const key = dayGroup(item.createdAt, now);
      (groups[key] ??= []).push({ ...item, time: timeAgo(item.createdAt, now) });
    });
    return SECTIONS.filter(section => groups[section.key]).map(section => ({
      ...section,
      data: groups[section.key],
    }));
  }, [state.items, filter, now]);

  return {
    sections,
    emptyKey: filter.emptyKey,
    loaded: state.loaded,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    filter: filter.id,
    setFilter,
    refresh: refreshNotifications,
    retry: loadNotifications,
    onViewableItemsChanged,
  };
}
