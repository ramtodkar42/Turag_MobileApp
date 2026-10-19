import createStore from './createStore';

const MAX_RECENT = 10;

// Recent searches, newest first: [{ query, image }].
// `image` is the first matching vehicle's photo (shown in the circle).
const store = createStore([]);

export const addRecentSearch = ({ query, image = null }) => {
  const clean = query.trim();
  if (!clean) {
    return;
  }
  store.set(list =>
    [{ query: clean, image }, ...list.filter(s => s.query.toLowerCase() !== clean.toLowerCase())].slice(
      0,
      MAX_RECENT,
    ),
  );
};

export const clearRecentSearches = () => store.set([]);

export const useRecentSearches = () => store.use();
