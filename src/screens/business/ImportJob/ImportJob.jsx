import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Header, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { formatSlot } from '../../../utils/date';
import { useT } from '../../../i18n';
import RemoteList from '../components/RemoteList';
import RowCard from '../components/RowCard';
import { importStatus, labelOr, rowStatus, shortId } from '../statuses';
import MetricTile from './components/MetricTile';
import useImportJob from './useImportJob';

// One bulk intake import (as the web's result card): the file, its status,
// uploaded / registered / duplicate / invalid counts, the error summary, then
// every row's outcome - the registration or why it failed.
// params: { orgId, importId, job? (shown while the latest loads) }
function ImportJob({ navigation, route }) {
  const t = useT();
  const { orgId, importId, job: passedJob } = route.params;
  const { remote, loadMore, loadingMore, moreError } = useImportJob(orgId, importId);
  const job = remote.data?.job ?? passedJob ?? null;

  const renderItem = useCallback(
    ({ item }) => {
      const status = rowStatus(item.status);
      return (
        <RowCard
          title={t('business.import.rowTitle', { number: item.rowNumber, reg: item.regNumber ?? '—' })}
          badge={{ label: labelOr(t, status.labelKey, item.status), tone: status.tone }}
          lines={[
            item.errorDetail ??
              (item.intakeId ? t('business.import.rowIntake', { id: shortId(item.intakeId) }) : null),
          ]}
        />
      );
    },
    [t],
  );

  const status = job ? importStatus(job.status) : null;
  const summary = job ? (
    <View>
      <View style={styles.titleRow}>
        <AppText variant="title" style={styles.flex} numberOfLines={2}>
          {job.filename}
        </AppText>
        <Badge label={labelOr(t, status.labelKey, job.status)} tone={status.tone} size="sm" />
      </View>
      {job.createdAt ? (
        <AppText variant="caption" style={styles.when}>
          {t('business.import.uploadedOn', { date: formatSlot(job.createdAt) })}
        </AppText>
      ) : null}
      <View style={styles.tiles}>
        <MetricTile label={t('business.import.metric.uploaded')} value={job.totalRows} />
        <MetricTile label={t('business.import.metric.registered')} value={job.createdCount} color={colors.success} />
        <MetricTile label={t('business.import.metric.duplicate')} value={job.skippedCount} color={colors.muted} />
        <MetricTile label={t('business.import.metric.invalid')} value={job.failedCount} color={colors.warning} />
      </View>
      {job.errorSummary ? (
        <AppText variant="caption" color={colors.warning} style={styles.when}>
          {job.errorSummary}
        </AppText>
      ) : null}
      <AppText variant="title" style={styles.rowsTitle}>
        {t('business.import.rows')}
      </AppText>
    </View>
  ) : null;

  const page = remote.data;
  return (
    <ScreenContainer header={<Header onBack={navigation.goBack} title={t('business.import.jobTitle')} />}>
      <RemoteList
        remote={remote}
        items={page?.rows ?? []}
        keyExtractor={item => String(item.rowNumber)}
        renderItem={renderItem}
        header={summary}
        footer={
          page?.nextCursor || moreError ? (
            <View style={styles.more}>
              {moreError ? (
                <AppText variant="caption" color={colors.danger} align="center">
                  {moreError}
                </AppText>
              ) : null}
              {page?.nextCursor ? (
                <Button
                  title={t('business.loadMore')}
                  variant="outline"
                  size="md"
                  loading={loadingMore}
                  onPress={loadMore}
                />
              ) : null}
            </View>
          ) : null
        }
        empty={{ title: t('business.import.noRows'), message: '' }}
        errorTitle={t('business.import.jobError')}
        skeleton={[2, 2, 2]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  when: {
    marginTop: spacing.xs,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rowsTitle: {
    marginTop: spacing.lg,
  },
  more: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

export default ImportJob;
