import createStore from './createStore';
import { persistStore, readCache } from '../utils/persistentCache';

const MAX_RECENT = 10;

// Recent searches, newest first: [{ query, image, filter?, labelKey? }]
//   query    - the text shown (a typed search, or a brand's name)
//   image    - the first matching vehicle's photo
//   filter   - set when it was a brand / price picked on the search screen:
//              { id: 'make' | 'price', value } - re-applied as that filter
//   labelKey - a price range's label (shown in the app's language)
// Kept on the phone (the cache is cleared on sign-out), so they're still
// there after the app restarts.
const store = createStore([]);

// Same search = same filter, or the same text (any case).
const keyOf = item => (item.filter ? `${item.filter.id}:${item.filter.value}` : `q:${item.query.toLowerCase()}`);

const CACHE_KEY = 'recent-searches';
readCache(CACHE_KEY).then(cached => {
  if (Array.isArray(cached) && cached.length) {
    // Anything searched before the cache loaded stays on top.
    store.set(list => {
      const seen = new Set(list.map(keyOf));
      return [...list, ...cached.filter(c => c?.query && !seen.has(keyOf(c)))].slice(0, MAX_RECENT);
    });
  }
});
persistStore(store, CACHE_KEY, list => list);

// A typed search ({ query, image? }) or a picked brand / price
// ({ query, filter, labelKey? }).
export const addRecentSearch = ({ query, image = null, filter = null, labelKey = null }) => {
  const clean = String(query ?? '').trim();
  if (!clean) {
    return;
  }
  const entry = { query: clean, image, ...(filter ? { filter } : {}), ...(labelKey ? { labelKey } : {}) };
  const key = keyOf(entry);
  store.set(list => [entry, ...list.filter(s => keyOf(s) !== key)].slice(0, MAX_RECENT));
};

export const clearRecentSearches = () => store.set([]);

export const useRecentSearches = () => store.use();
