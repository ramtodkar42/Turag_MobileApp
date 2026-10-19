import { useEffect, useRef, useState } from 'react';
import { tNow } from '../i18n';

// Calls `fetcher()` now and then every `interval` ms until `isDone(result)`.
// Returns { data, error }. Stops when the screen unmounts.
export default function usePolling(fetcher, { interval = 2000, isDone = () => false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const fetcherRef = useRef(fetcher);
  const isDoneRef = useRef(isDone);
  fetcherRef.current = fetcher;
  isDoneRef.current = isDone;

  useEffect(() => {
    let active = true;
    let timer = null;

    const tick = async () => {
      try {
        const result = await fetcherRef.current();
        if (!active) {
          return;
        }
        setData(result);
        setError('');
        if (!isDoneRef.current(result)) {
          timer = setTimeout(tick, interval);
        }
      } catch (e) {
        if (active) {
          setError(e.message || tNow('common.couldNotRefresh'));
          timer = setTimeout(tick, interval);
        }
      }
    };

    tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [interval]);

  return { data, error };
}
