import { useCallback } from 'react';
import { formatSlotDate } from '../../../../utils/date';
import useRemoteData from '../../../../hooks/useRemoteData';
import { getIntakeImports } from '../../../../api/services/business.api';
import { useT } from '../../../../i18n';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import { importStatus, labelOr } from '../../statuses';

// Bulk imports: the org's CSV intake imports, newest first, with how many
// rows were registered / duplicate / invalid. Open one for its per-row
// results. (A new import starts from the screen's footer button.)
function ImportsTab({ orgId, top, onOpen }) {
  const t = useT();
  const remote = useRemoteData(() => getIntakeImports(orgId), [orgId]);

  const renderItem = useCallback(
    ({ item }) => {
      const status = importStatus(item.status);
      return (
        <RowCard
          title={item.filename}
          badge={{ label: labelOr(t, status.labelKey, item.status), tone: status.tone }}
          lines={[
            t('business.import.counts', {
              total: item.totalRows,
              created: item.createdCount,
              skipped: item.skippedCount,
              failed: item.failedCount,
            }),
            item.createdAt ? t('business.import.uploadedOn', { date: formatSlotDate(item.createdAt) }) : null,
          ]}
          onPress={() => onOpen(item)}
        />
      );
    },
    [onOpen, t],
  );

  return (
    <RemoteList
      remote={remote}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      header={top}
      empty={{ title: t('business.import.listEmpty.title'), message: t('business.import.listEmpty.message') }}
      errorTitle={t('business.import.listError')}
    />
  );
}

export default ImportsTab;
