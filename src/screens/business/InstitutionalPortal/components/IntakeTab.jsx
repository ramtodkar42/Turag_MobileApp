import { useCallback } from 'react';
import { formatSlotDate } from '../../../../utils/date';
import useRemoteData from '../../../../hooks/useRemoteData';
import { getIntakeList } from '../../../../api/services/business.api';
import { useT } from '../../../../i18n';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import { intakeStatus, labelOr, shortId } from '../../statuses';

// Intake: the repossessed assets registered for the org (read-only); open
// one for its documents and possession inventory.
function IntakeTab({ orgId, top, onOpen }) {
  const t = useT();
  const remote = useRemoteData(() => getIntakeList(orgId), [orgId]);

  const renderItem = useCallback(
    ({ item }) => {
      const status = intakeStatus(item.status);
      return (
        <RowCard
          title={t('business.intake.rowTitle', { id: shortId(item.id) })}
          badge={{ label: labelOr(t, status.labelKey, item.status), tone: status.tone }}
          lines={[
            `${t('business.field.vehicle')}: ${item.vehicleId ? shortId(item.vehicleId) : t('business.notSet')}`,
            item.createdAt ? t('business.intake.registeredOn', { date: formatSlotDate(item.createdAt) }) : null,
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
      empty={{ title: t('business.intake.empty.title'), message: t('business.intake.empty.message') }}
      errorTitle={t('business.intake.error')}
    />
  );
}

export default IntakeTab;
