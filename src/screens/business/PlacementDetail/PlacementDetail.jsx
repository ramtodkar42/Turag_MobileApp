import { StyleSheet, View } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Badge,
  Button,
  CardListSkeleton,
  Header,
  InfoNote,
  KeyValueCard,
  ScreenContainer,
  StatusView,
  TitledCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { formatSlot, formatSlotDate } from '../../../utils/date';
import useRemoteData from '../../../hooks/useRemoteData';
import { getPlacement } from '../../../api/services/business.api';
import { useT } from '../../../i18n';
import { labelOr, placementStatus } from '../statuses';

// One yard placement (read-only): yard, bay, storage days, when it was placed
// / released, and its movement log (bay changes, with the reason).
// params: { orgId, placementId }
function PlacementDetail({ navigation, route }) {
  const t = useT();
  const { orgId, placementId } = route.params;
  const { data, loading, refreshing, error, refresh, reload } = useRemoteData(
    () => getPlacement(orgId, placementId),
    [orgId, placementId],
  );
  const header = <Header onBack={navigation.goBack} title={t('business.yard.title')} />;
  const none = t('business.notSet');

  if (loading) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[5, 3]} style={styles.card} />
      </ScreenContainer>
    );
  }
  if (error) {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('business.yard.detailError')} message={error}>
          <Button title={t('common.retry')} size="md" onPress={reload} style={styles.card} />
        </StatusView>
      </ScreenContainer>
    );
  }

  const status = placementStatus(data.status);
  return (
    <ScreenContainer
      scroll
      header={header}
      refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <KeyValueCard
        style={styles.card}
        header={
          <Badge label={labelOr(t, status.labelKey, data.status)} tone={status.tone} style={styles.badge} />
        }
        rows={[
          { label: t('business.yard.yard'), value: data.yardCode },
          { label: t('business.yard.bay'), value: data.bayCode ?? none },
          { label: t('business.field.storage'), value: t('business.days', { count: data.storageDays }) },
          { label: t('business.field.vehicle'), value: data.vehicleId ?? none },
          { label: t('business.yard.intake'), value: data.intakeId ?? none },
          { label: t('business.yard.placed'), value: data.placedAt ? formatSlotDate(data.placedAt) : none },
          { label: t('business.yard.released'), value: data.releasedAt ? formatSlotDate(data.releasedAt) : none },
        ]}
      />

      <TitledCard title={t('business.yard.movements')} style={styles.card}>
        {data.movements.length ? (
          data.movements.map(m => (
            <View key={m.id} style={styles.item}>
              <AppText variant="label" color={colors.heading}>
                {t('business.yard.move', { from: m.fromBay ?? none, to: m.toBay ?? none })}
              </AppText>
              <AppText variant="caption">
                {[m.movedAt ? formatSlot(m.movedAt) : null, m.reason].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="caption" style={styles.item}>
            {t('business.yard.noMovements')}
          </AppText>
        )}
      </TitledCard>
      <InfoNote style={styles.card}>{t('business.readOnlyNote')}</InfoNote>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  badge: {
    marginBottom: spacing.sm,
  },
  item: {
    marginTop: spacing.sm,
    gap: spacing.xxs,
  },
});

export default PlacementDetail;
