import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { onReconnect } from '../store/networkStore';
import { tNow } from '../i18n';

// Data for a page that shows one thing from the backend (a booking, an offer list...).
//   loader()   - returns the data (throws ApiError on failure)
// Returns {
//   data, setData (e.g. after an action returns the updated item),
//   loading    - first load only (show placeholders)
//   refreshing - pull-to-refresh only
//   error      - the first load failed (later failures keep the data on screen)
//   errorCode  - its ApiError code (e.g. 'BOOKING_NOT_FOUND')
//   refresh()  - pull-to-refresh;  reload() - quiet reload (after an action / on retry)
// }
// Coming back to the page reloads quietly, so it's never stale.
export default function useRemoteData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const mounted = useRef(true);
  const hasData = useRef(false);
  const firstFocus = useRef(true);
  // Bumped by every load and every setData: only the newest answer may land,
  // so a slow earlier load never overwrites newer data (e.g. after an action).
  const latest = useRef(0);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const run = useCallback(async ({ pull = false } = {}) => {
    const id = ++latest.current;
    const current = () => mounted.current && id === latest.current;
    if (pull) {
      setRefreshing(true);
    }
    if (!hasData.current) {
      setLoading(true);
      setError('');
      setErrorCode(null);
    }
    try {
      const result = await loaderRef.current();
      if (current()) {
        hasData.current = true;
        setData(result);
        setError('');
        setErrorCode(null);
      }
    } catch (e) {
      // A refresh that fails keeps what's on screen.
      if (current() && !hasData.current) {
        setError(e.message || tNow('errors.generic'));
        setErrorCode(e.code ?? null);
      }
    } finally {
      if (current()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    hasData.current = false;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Back online after a failed first load: retry automatically (no tap needed).
  useEffect(
    () =>
      onReconnect(() => {
        if (mounted.current && !hasData.current) {
          run();
        }
      }),
    [run],
  );

  // Coming back from another page (e.g. the chat): reload quietly.
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (hasData.current) {
        run();
      }
    }, [run]),
  );

  const update = useCallback(next => {
    latest.current += 1; // a load already on its way is now older than this
    hasData.current = true;
    setData(next);
    setLoading(false);
    setRefreshing(false);
  }, []);

  return {
    data,
    setData: update,
    loading,
    refreshing,
    error,
    errorCode,
    refresh: useCallback(() => run({ pull: true }), [run]),
    reload: useCallback(() => run(), [run]),
  };
}
