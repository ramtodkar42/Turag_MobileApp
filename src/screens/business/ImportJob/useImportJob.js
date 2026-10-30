import { useCallback, useState } from 'react';
import useRemoteData from '../../../hooks/useRemoteData';
import { getIntakeImport, getIntakeImportRows } from '../../../api/services/business.api';

// One import job and its per-row results (200 a page, "Load more" for the
// rest), so a bulk import never hides a dropped row.
// Returns { remote (data = { job, rows, nextCursor }), loadMore, loadingMore, moreError }
export default function useImportJob(orgId, importId) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const remote = useRemoteData(async () => {
    const [job, page] = await Promise.all([getIntakeImport(orgId, importId), getIntakeImportRows(orgId, importId)]);
    return { job, rows: page.rows, nextCursor: page.nextCursor };
  }, [orgId, importId]);
  const { data, setData } = remote;

  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setMoreError('');
    const cursor = data.nextCursor;
    try {
      const page = await getIntakeImportRows(orgId, importId, { cursor });
      // Only onto the same list (a pull-to-refresh meanwhile started it over).
      setData(prev =>
        prev?.nextCursor === cursor ? { ...prev, rows: [...prev.rows, ...page.rows], nextCursor: page.nextCursor } : prev,
      );
    } catch (e) {
      setMoreError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }, [data, importId, loadingMore, orgId, setData]);

  return { remote, loadMore, loadingMore, moreError };
}
