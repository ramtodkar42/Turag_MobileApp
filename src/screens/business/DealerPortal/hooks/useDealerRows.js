import { useCallback, useState } from 'react';
import useRemoteData from '../../../../hooks/useRemoteData';

// The dealer dashboard's Offers / Sales lists: a status filter and "Load more"
// paging. Changing the filter loads page one again.
// fetchPage(orgId, { status, cursor }) -> { items, nextCursor }.
// Returns { remote (useRemoteData; data = { items, nextCursor }), status,
//   setStatus(value), loadMore(), loadingMore, moreError }
export default function useDealerRows(fetchPage, orgId, initialStatus) {
  const [status, setStatusValue] = useState(initialStatus);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const remote = useRemoteData(() => fetchPage(orgId, { status }), [orgId, status]);
  const { data, setData } = remote;

  const setStatus = useCallback(value => {
    setMoreError('');
    setStatusValue(value);
  }, []);

  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setMoreError('');
    const cursor = data.nextCursor;
    try {
      const next = await fetchPage(orgId, { status, cursor });
      // Only onto the same list (not one a filter change / refresh replaced meanwhile).
      setData(prev =>
        prev?.nextCursor === cursor
          ? {
              items: [...prev.items, ...next.items.filter(n => !prev.items.some(p => p.id === n.id))],
              nextCursor: next.nextCursor,
            }
          : prev,
      );
    } catch (e) {
      setMoreError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }, [data, fetchPage, loadingMore, orgId, setData, status]);

  return { remote, status, setStatus, loadMore, loadingMore, moreError };
}
