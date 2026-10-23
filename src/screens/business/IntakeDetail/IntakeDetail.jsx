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
import { formatSlotDate } from '../../../utils/date';
import useRemoteData from '../../../hooks/useRemoteData';
import { getIntake } from '../../../api/services/business.api';
import { useT } from '../../../i18n';
import { BUSINESS_ROUTES } from '../routes';
import { intakeStatus, labelOr } from '../statuses';

// One intake registration (read-only): its status and links, the authority
// documents on file and the possession inventory. Opens its yard placement
// when it has one.
// params: { orgId, intakeId }
function IntakeDetail({ navigation, route }) {
  const t = useT();
  const { orgId, intakeId } = route.params;
  const { data, loading, refreshing, error, refresh, reload } = useRemoteData(
    () => getIntake(orgId, intakeId),
    [orgId, intakeId],
  );
  const header = <Header onBack={navigation.goBack} title={t('business.intake.title')} />;
  const none = t('business.notSet');

  if (loading) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[5, 3, 2]} style={styles.card} />
      </ScreenContainer>
    );
  }
  if (error) {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('business.intake.detailError')} message={error}>
          <Button title={t('common.retry')} size="md" onPress={reload} style={styles.card} />
        </StatusView>
      </ScreenContainer>
    );
  }

  const status = intakeStatus(data.status);
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
          { label: t('business.intake.id'), value: data.id },
          { label: t('business.field.vehicle'), value: data.vehicleId ?? none },
          { label: t('business.intake.inspection'), value: data.inspectionId ?? none },
          { label: t('business.intake.authorityDoc'), value: data.authorityDocId },
          { label: t('business.intake.placement'), value: data.placementId ?? none },
          { label: t('business.intake.registered'), value: data.createdAt ? formatSlotDate(data.createdAt) : none },
        ]}
      />

      <TitledCard title={t('business.intake.documents')} style={styles.card}>
        {data.documents.length ? (
          data.documents.map(doc => (
            <View key={doc.id} style={styles.item}>
              <View style={styles.itemTop}>
                <AppText variant="label" color={colors.heading} style={styles.flex}>
                  {labelOr(t, `business.docType.${doc.type}`, doc.type)}
                </AppText>
                <Badge
                  label={t(doc.verifiedAt ? 'business.intake.verified' : 'business.intake.unverified')}
                  tone={doc.verifiedAt ? 'success' : 'neutral'}
                  size="sm"
                />
              </View>
              {doc.validUntil ? (
                <AppText variant="caption">
                  {t('business.intake.validUntil', { date: formatSlotDate(doc.validUntil) })}
                </AppText>
              ) : null}
            </View>
          ))
        ) : (
          <AppText variant="caption" style={styles.item}>
            {t('business.intake.noDocuments')}
          </AppText>
        )}
      </TitledCard>

      <TitledCard title={t('business.intake.possession')} style={styles.card}>
        {data.possessionItems.length ? (
          data.possessionItems.map(item => (
            <View key={item.id} style={styles.item}>
              <AppText variant="label" color={colors.heading}>
                {item.label}
              </AppText>
              {item.note ? <AppText variant="caption">{item.note}</AppText> : null}
            </View>
          ))
        ) : (
          <AppText variant="caption" style={styles.item}>
            {t('business.intake.noPossession')}
          </AppText>
        )}
      </TitledCard>

      {data.placementId ? (
        <Button
          title={t('business.intake.viewPlacement')}
          variant="outline"
          onPress={() =>
            navigation.navigate(BUSINESS_ROUTES.PLACEMENT_DETAIL, { orgId, placementId: data.placementId })
          }
          style={styles.card}
        />
      ) : null}
      <InfoNote style={styles.card}>{t('business.readOnlyNote')}</InfoNote>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default IntakeDetail;
