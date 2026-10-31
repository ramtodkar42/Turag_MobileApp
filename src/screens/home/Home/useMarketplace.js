import { useCallback, useEffect, useRef, useState } from 'react';
import useDebounce from '../../../hooks/useDebounce';
import { getMarketplaceVehicles, parseSearchQuery } from '../../../api/services/vehicle.api';
import { withoutChips } from '../../../api/mappers/searchParse';
import { useListedCount } from '../../../store/garageStore';
import { onReconnect } from '../../../store/networkStore';
import prefetchImages from '../../../utils/prefetchImages';
import { CATEGORIES, DEFAULT_FILTERS, fitFilters } from './constants';
import { VEHICLE_TYPES } from './filterCatalog';
import { tNow } from '../../../i18n';

// Results kept per search (tab + filters + text), newest last.
const CACHE_LIMIT = 20;
// A search seen this recently is shown from memory without asking again.
const FRESH_MS = 30000;

// Chosen quick filters -> backend filters, e.g. { city: 'PUNE', price_max: 500000 }.
// The price range "min-max" (rupees, max may be empty) becomes price_min / price_max.
const toFilters = ({ price, ...rest }) => {
  if (!price) {
    return rest;
  }
  const [min, max] = price.split('-');
  return {
    ...rest,
    price_min: Number(min) > 0 ? Number(min) : undefined,
    price_max: max ? Number(max) : undefined,
  };
};

// The Car / Bike filter for a category tab ('cars' | 'bikes'; otherwise none).
const vehicleOf = category => (VEHICLE_TYPES.includes(category) ? category : undefined);

// Drops choices that don't fit the category (Car / Bike) or each other - e.g.
// Diesel, a car price, Body Type or a car make once Bike is picked, or a model
// of another make (see fitFilters).
const prune = (filters, category) => {
  const { vehicle: _vehicle, ...rest } = fitFilters({ ...filters, vehicle: vehicleOf(category) });
  return rest;
};

// Search texts already understood (smart search), so a tab change, a filter
// or the next page doesn't ask the server again. Small: the latest few.
const PARSE_CACHE_LIMIT = 30;

// What makes a first page "the same": vehicles, prices and reserved state.
// (Photo links are left out: the backend signs a new short-lived link each time.)
const signature = items => items.map(v => `${v.id}:${v.price}:${v.reserved ? 1 : 0}`).join('|');

// Search text, quick filters, category tab and the paged vehicle list for Home.
// Show cached, refresh quietly ("stale-while-revalidate"):
// - A search seen before (e.g. going back to a tab) shows its results at once,
//   with no placeholders; it is re-checked in the background (after 30 s) and
//   the grid only changes if the results did.
// - A new search shows placeholders, then the first page.
// - loadMore() fetches the next page (infinite scroll).
// - Pull-to-refresh and "a listing went live" fetch fresh data.
// - Answers that arrive after a newer search are ignored.
// Smart search (as the web): the text is first understood by the server
// ("diesel SUV under 10 lakh" -> fuel, body type, price) and searched as those
// filters; each shows as a chip that can be removed. When nothing matches
// exactly, the backend's closest vehicles are shown instead (`closest`).
export default function useMarketplace() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [category, setCategory] = useState('all');
  // Chips taken off for one search text: { query, keys }.
  const [removed, setRemoved] = useState({ query: '', keys: [] });
  // What the current search was understood as ({ chips } | null), and whether
  // the grid shows the closest vehicles (nothing matched exactly).
  const [smart, setSmart] = useState(null);
  const [closest, setClosest] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // A new search's results are on their way while the previous cards stay on
  // screen (no placeholders, no blink): the grid shows them under a soft veil.
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  // { n, force }: force = ignore the cache (pull-to-refresh, data changed).
  const [reload, setReload] = useState({ n: 0, force: false });
  const debouncedQuery = useDebounce(query);
  const listedCount = useListedCount(); // reload when the user lists a vehicle

  // Bumped on every request so late answers are dropped.
  const requestId = useRef(0);
  // searchKey -> { items, nextCursor, firstPage (signature), fetchedAt }
  const cache = useRef(new Map());
  const lastListedCount = useRef(listedCount);
  // How many cards are on screen now (read when a new search starts).
  const shownCount = useRef(0);
  shownCount.current = vehicles.length;

  // search text -> what it was understood as (null: nothing / couldn't ask)
  const parsed = useRef(new Map());

  const comingSoon = !!CATEGORIES.find(c => c.id === category)?.comingSoon;
  const text = debouncedQuery.trim();
  const removedKeys = removed.query === text ? removed.keys : [];
  const searchKey = JSON.stringify([text, category, filters, removedKeys]);

  // One page: the text understood first (once per text), then the search.
  // Returns { items, closest (bool: showing the nearest ones), nextCursor, smart }.
  const searchPage = useCallback(async (key, cursor = null) => {
    const [q, cat, chosen, dropped] = JSON.parse(key);
    let understood = null;
    if (q) {
      let result = parsed.current.get(q);
      if (!parsed.current.has(q)) {
        result = await parseSearchQuery(q);
        // Remembered only when the server answered (undefined = couldn't ask:
        // the next search of this text asks again).
        if (result !== undefined) {
          parsed.current.set(q, result);
          if (parsed.current.size > PARSE_CACHE_LIMIT) {
            parsed.current.delete(parsed.current.keys().next().value);
          }
        }
      }
      understood = withoutChips(result ?? null, dropped);
    }
    const page = await getMarketplaceVehicles({
      query: q,
      category: cat,
      filters: toFilters(chosen),
      smart: understood?.filters ?? null,
      cursor,
    });
    const nearest = !cursor && page.items.length === 0 && page.closest.length > 0;
    return {
      items: nearest ? page.closest : page.items,
      closest: nearest,
      nextCursor: nearest ? null : page.nextCursor,
      smart: understood?.chips.length ? { chips: understood.chips } : null,
    };
  }, []);

  const remember = useCallback((key, entry) => {
    const map = cache.current;
    // Read the existing entry BEFORE deleting, so a partial update (e.g. just
    // `fetchedAt`) keeps the cached items instead of wiping them. Deleting then
    // re-setting moves the key to the end (LRU).
    const prev = map.get(key);
    map.delete(key);
    map.set(key, { ...prev, ...entry });
    if (map.size > CACHE_LIMIT) {
      map.delete(map.keys().next().value);
    }
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    setLoadingMore(false);

    // One of the user's listings went live: everything cached may be stale.
    let force = reload.force;
    if (lastListedCount.current !== listedCount) {
      lastListedCount.current = listedCount;
      cache.current.clear();
      force = true;
    }

    if (comingSoon) {
      setVehicles([]);
      setNextCursor(null);
      setError(null);
      setLoading(false);
      setUpdating(false);
      setRefreshing(false);
      return;
    }

    const hadCards = shownCount.current > 0;
    // Only treat it as a hit if it actually carries items; a malformed/partial
    // entry is a miss (and never crashes on `cached.items.length`).
    const stored = force ? null : cache.current.get(searchKey);
    const cached = stored?.items ? stored : null;
    if (cached) {
      // Seen before: show it now - no placeholders, no blink.
      setVehicles(cached.items);
      setNextCursor(cached.nextCursor);
      setSmart(cached.smart ?? null);
      setClosest(!!cached.closest);
      setError(null);
      setLoading(false);
      setUpdating(false);
      // A fresh, NON-empty result is trusted as is. An empty cached result is
      // always re-checked (e.g. switching back to a tab that was briefly empty
      // / offline) so a tab that now has vehicles doesn't keep showing "none".
      if (cached.items.length > 0 && Date.now() - cached.fetchedAt < FRESH_MS) {
        return;
      }
    } else if (!force) {
      if (shownCount.current > 0) {
        // A new search over cards already on screen: keep them (veiled) until
        // the new ones arrive, then swap - smooth, no placeholders.
        setUpdating(true);
      } else {
        // Nothing on screen yet: placeholders until the first page arrives.
        setVehicles([]);
        setLoading(true);
      }
    }

    searchPage(searchKey)
      .then(({ items, closest: nearest, nextCursor: cursor, smart: understood }) => {
        if (id !== requestId.current) {
          return;
        }
        setSmart(understood);
        setClosest(nearest);
        const firstPage = signature(items);
        const keepScrolled = cached && cached.firstPage === firstPage;
        if (keepScrolled) {
          // Nothing changed: keep the grid (and the pages already loaded) as is.
          remember(searchKey, { fetchedAt: Date.now() });
        } else {
          setVehicles(items);
          setNextCursor(cursor);
          remember(searchKey, {
            items,
            nextCursor: cursor,
            firstPage,
            fetchedAt: Date.now(),
            smart: understood,
            closest: nearest,
          });
          // Warm the cache with the cards' photos so the grid paints instantly.
          prefetchImages(items.map(v => v.image));
        }
        setError(null);
      })
      .catch(e => {
        // With results on screen - cached, or a pull-to-refresh / reload of
        // the same search - a failed check stays quiet and keeps the cars.
        if (id === requestId.current && !cached && !(force && hadCards)) {
          // The previous search's cards don't belong to this one.
          setVehicles([]);
          setNextCursor(null);
          setSmart(null);
          setClosest(false);
          setError(e.message || tNow('home.error.load'));
        }
      })
      .finally(() => {
        if (id === requestId.current) {
          setLoading(false);
          setUpdating(false);
          setRefreshing(false);
        }
      });
  }, [searchKey, comingSoon, reload, listedCount, remember, searchPage]);

  const loadMore = useCallback(() => {
    // Not while a new search is loading: the cursor still belongs to the old one.
    if (!nextCursor || loading || loadingMore || refreshing || updating) {
      return;
    }
    const id = requestId.current;
    const key = searchKey;
    setLoadingMore(true);
    searchPage(key, nextCursor)
      .then(({ items, nextCursor: cursor }) => {
        if (id !== requestId.current) {
          return;
        }
        setVehicles(prev => {
          const known = new Set(prev.map(v => v.id));
          const merged = [...prev, ...items.filter(v => !known.has(v.id))];
          remember(key, { items: merged, nextCursor: cursor });
          return merged;
        });
        setNextCursor(cursor);
        // Warm the cache with the next page's photos.
        prefetchImages(items.map(v => v.image));
      })
      // The footer offers no retry; scrolling again tries the same page.
      .catch(() => {})
      .finally(() => {
        if (id === requestId.current) {
          setLoadingMore(false);
        }
      });
  }, [nextCursor, loading, loadingMore, refreshing, updating, searchKey, remember, searchPage]);

  // Takes one understood filter off this search (its chip's × ).
  const removeChip = chipKey =>
    setRemoved(prev => ({
      query: text,
      keys: [...(prev.query === text ? prev.keys : []), chipKey],
    }));

  // Category tab (and the Car / Bike filter): drops a make / model that
  // doesn't fit the new type.
  const changeCategory = next => {
    setCategory(next);
    setFilters(prev => prune(prev, next));
  };

  // One quick filter's choice; null / '' clears it. Other filters stay, except
  // a model that doesn't belong to a newly picked make. 'vehicle' (Car / Bike)
  // is the category tab. `inCategory`: switch to that tab too (e.g. a car brand
  // picked on the search screen while Bikes was open shows on All).
  const setFilter = (id, value, { inCategory } = {}) => {
    if (id === 'vehicle') {
      changeCategory(value || 'all');
      return;
    }
    const target = inCategory ?? category;
    if (inCategory) {
      setCategory(inCategory);
    }
    setFilters(prev => {
      const next = { ...prev };
      if (value) {
        next[id] = value;
      } else {
        delete next[id];
      }
      return prune(next, target);
    });
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery('');
  };

  // Fetch fresh data without placeholders (e.g. after a new listing goes live).
  const reloadFresh = useCallback(() => setReload(r => ({ n: r.n + 1, force: true })), []);

  // Back online after the grid failed to load: try again automatically.
  const errorRef = useRef(error);
  errorRef.current = error;
  useEffect(() => onReconnect(() => errorRef.current && reloadFresh()), [reloadFresh]);

  // After an error: show placeholders and try again.
  const retry = () => {
    setError(null);
    setLoading(true);
    reloadFresh();
  };

  const refresh = () => {
    setRefreshing(true);
    reloadFresh();
  };

  return {
    reload: reloadFresh,
    query,
    setQuery,
    // The quick filters' choices, with Car / Bike from the category tab.
    filters: { ...filters, vehicle: vehicleOf(category) },
    setFilter,
    clearFilters,
    hasFilters: Object.keys(filters).length > 0 || debouncedQuery.trim() !== '',
    // A text search on its way: the typing pause before it's sent, then the
    // first page loading (cached results show at once, so no flash for them).
    searching: query.trim() !== '' && (query.trim() !== debouncedQuery.trim() || loading || updating),
    // New results on their way over the cards on screen (any search / filter / tab).
    updating,
    // Smart search: what the text was understood as ({ chips } | null, only
    // while that text is in the box), and whether the closest vehicles show.
    smart: text && query.trim() === text ? smart : null,
    removeChip,
    closest,
    category,
    setCategory: changeCategory,
    comingSoon,
    vehicles,
    hasMore: !!nextCursor,
    loadMore,
    loading,
    loadingMore,
    refreshing,
    error,
    refresh,
    retry,
  };
}
