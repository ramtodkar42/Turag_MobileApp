import { useMemo, useState } from 'react';
import { toIsoDate } from '../utils/date';

// Search + status tab + day + sort for a list, all on the phone (as the web's
// My inspections / My offers lists, which filter what's already loaded).
// items: the list (null while loading). options: {
//   statusOf(item)   - its status (the tabs: All + every status present)
//   searchText(item) - the text a search looks in
//   timeOf(item)     - ms of its day for the date filter (optional)
//   sorts            - [{ value, compare(a, b) }] (optional; the first is the default)
// }
// Returns { query, setQuery, status, setStatus, tabs [{ value, count }], date,
//   setDate, sort, setSort, filtered, filtering, clear }.
export default function useListFilters(items, { statusOf, searchText, timeOf, sorts }) {
  const [query, setQuery] = useState('');
  const [chosen, setStatus] = useState('ALL');
  const [date, setDate] = useState(null); // ISO day, e.g. '2026-10-25'
  const [sort, setSort] = useState(sorts?.[0]?.value ?? null);
  const list = useMemo(() => items ?? [], [items]);

  // All + each status present, in the order they first appear, with counts.
  const tabs = useMemo(() => {
    const counts = new Map();
    list.forEach(item => {
      const s = statusOf(item);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    return [{ value: 'ALL', count: list.length }, ...[...counts].map(([value, count]) => ({ value, count }))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  // A status that's gone from the list (e.g. after a cancel) falls back to All.
  const status = tabs.some(tab => tab.value === chosen) ? chosen : 'ALL';

  const filtered = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const out = list.filter(item => {
      if (status !== 'ALL' && statusOf(item) !== status) return false;
      if (date && timeOf) {
        const time = timeOf(item);
        if (time == null || toIsoDate(new Date(time)) !== date) return false;
      }
      if (words.length) {
        const text = String(searchText(item) ?? '').toLowerCase();
        if (!words.every(w => text.includes(w))) return false;
      }
      return true;
    });
    const compare = sorts?.find(s => s.value === sort)?.compare;
    return compare ? [...out].sort(compare) : out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, query, status, date, sort]);

  const filtering = query.trim() !== '' || status !== 'ALL' || date != null;
  const clear = () => {
    setQuery('');
    setStatus('ALL');
    setDate(null);
  };

  return { query, setQuery, status, setStatus, tabs, date, setDate, sort, setSort, filtered, filtering, clear };
}
