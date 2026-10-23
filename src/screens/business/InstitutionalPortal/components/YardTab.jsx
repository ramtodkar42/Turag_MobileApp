import { useCallback } from 'react';
import { formatSlotDate } from '../../../../utils/date';
import useRemoteData from '../../../../hooks/useRemoteData';
import { getYard } from '../../../../api/services/business.api';
import { useT } from '../../../../i18n';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import { labelOr, placementStatus, shortId } from '../../statuses';

// Yard: where the org's assets are parked (yard · bay) and for how long
// (storage days are a count, not a cost). Open one for its movement log.
function YardTab({ orgId, top, onOpen }) {
  const t = useT();
  const remote = useRemoteData(() => getYard(orgId), [orgId]);

  const renderItem = useCallback(
    ({ item }) => {
      const status = placementStatus(item.status);
      return (
        <RowCard
          title={item.bayCode ? `${item.yardCode} · ${item.bayCode}` : item.yardCode}
          badge={{ label: labelOr(t, status.labelKey, item.status), tone: status.tone }}
          lines={[
            `${t('business.field.vehicle')}: ${item.vehicleId ? shortId(item.vehicleId) : t('business.notSet')}`,
            `${t('business.field.storage')}: ${t('business.days', { count: item.storageDays })}`,
            item.placedAt ? t('business.yard.placedOn', { date: formatSlotDate(item.placedAt) }) : null,
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
      empty={{ title: t('business.yard.empty.title'), message: t('business.yard.empty.message') }}
      errorTitle={t('business.yard.error')}
    />
  );
}

export default YardTab;
