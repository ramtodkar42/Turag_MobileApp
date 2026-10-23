import { useCallback, useState } from 'react';
import useRemoteData from '../../../../hooks/useRemoteData';
import { getPortfolio } from '../../../../api/services/business.api';

export const NO_FILTERS = { status: '', category: '', ageingBucket: '', location: '' };

// The org's portfolio with the web's filters (status, category, ageing,
// location) and "Load more" paging. Changing a filter loads page one again.
// Returns { remote (useRemoteData; data = { items, nextCursor }), filters,
//   setFilter(id, value), loadMore(), loadingMore, moreError }
export default function usePortfolio(orgId) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const remote = useRemoteData(
    () => getPortfolio(orgId, filters),
    [orgId, filters.status, filters.category, filters.ageingBucket, filters.location],
  );
  const { data, setData } = remote;

  const setFilter = useCallback((id, value) => {
    setMoreError('');
    setFilters(f => ({ ...f, [id]: value }));
  }, []);

  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setMoreError('');
    try {
      const next = await getPortfolio(orgId, { ...filters, cursor: data.nextCursor });
      setData(prev => ({ items: [...(prev?.items ?? []), ...next.items], nextCursor: next.nextCursor }));
    } catch (e) {
      setMoreError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }, [data, filters, loadingMore, orgId, setData]);

  return { remote, filters, setFilter, loadMore, loadingMore, moreError };
}
