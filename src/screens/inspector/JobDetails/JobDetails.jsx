import { StyleSheet, View } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Badge,
  Button,
  Card,
  CardListSkeleton,
  FadeIn,
  Header,
  InfoNote,
  KeyValueCard,
  ScreenContainer,
  StatusView,
  TitledCard,
} from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatSlot } from '../../../utils/date';
import { openDirections } from '../../../utils/linking';
import useRemoteData from '../../../hooks/useRemoteData';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { getInspectorJob } from '../../../api/services/inspector.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { BOOKING_STATUS } from '../../account/statuses';
import StartInspection from './components/StartInspection';

// One job (as the web's job page): when and where (with directions), the
// inspection - start it on site, or continue it - and chat with the customer.
// params: { bookingId }
function JobDetails({ navigation, route }) {
  const t = useT();
  const { bookingId } = route.params;
  const { data: job, loading, refreshing, error, errorCode, refresh, reload } = useRemoteData(
    () => getInspectorJob(bookingId),
    [bookingId],
  );
  const { confirm, dialog } = useConfirmDialog();
  const header = <Header onBack={navigation.goBack} title={t('inspector.job.title')} />;

  if (loading) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[2, 3, 3]} style={styles.card} />
      </ScreenContainer>
    );
  }
  if (error) {
    const gone = errorCode === 'BOOKING_NOT_FOUND';
    return (
      <ScreenContainer header={header}>
        <StatusView title={t(gone ? 'inspector.job.goneTitle' : 'inspector.job.errorTitle')} message={gone ? t('inspector.job.notFound') : error}>
          <Button
            title={gone ? t('common.back') : t('common.retry')}
            size="md"
            onPress={gone ? navigation.goBack : reload}
            style={styles.action}
          />
        </StatusView>
      </ScreenContainer>
    );
  }

  const status = BOOKING_STATUS[job.status] ?? BOOKING_STATUS.REQUESTED;
  const kind = t(`account.booking.kind.${job.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`);
  const place = [job.address, [job.city, job.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const openCapture = inspectionId =>
    navigation.navigate(ROUTES.INSPECTION_CAPTURE, { inspectionId, bookingId: job.id });

  const onDirections = async () => {
    if (!(await openDirections({ address: place }))) {
      confirm({
        title: t('inspector.accepted.openMapsFailed'),
        message: t('inspector.accepted.openFailedMessage'),
        confirmLabel: t('common.ok'),
        cancelLabel: null,
      });
    }
  };

  let inspection;
  if (job.inspectionId) {
    inspection = (
      <>
        <AppText variant="subtitle" style={styles.text}>
          {t('inspector.job.inProgress')}
        </AppText>
        <Button
          title={t('inspector.jobs.continue')}
          size="md"
          onPress={() => openCapture(job.inspectionId)}
          style={styles.button}
        />
      </>
    );
  } else if (job.status === 'ASSIGNED') {
    inspection = (
      <StartInspection
        job={job}
        onStarted={inspectionId => {
          reload();
          openCapture(inspectionId);
        }}
      />
    );
  } else {
    inspection = (
      <AppText variant="subtitle" style={styles.text}>
        {t(job.status === 'FULFILLED' ? 'inspector.job.complete' : 'inspector.job.notStartable')}
      </AppText>
    );
  }

  return (
    <ScreenContainer
      scroll
      header={header}
      refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <FadeIn>
        <Card style={styles.card}>
          <View style={styles.top}>
            <AppText variant="h3" style={styles.time}>
              {job.slotAt ? formatSlot(job.slotAt) : '—'}
            </AppText>
            <Badge label={t(status.labelKey)} tone={status.tone} />
          </View>
          <AppText variant="label">{t('account.booking.heading', { kind })}</AppText>
        </Card>

        <KeyValueCard
          dense
          rows={[
            { label: t('account.booking.where'), value: place || '—' },
            { label: t('inspector.job.reference'), value: job.id },
          ]}
          style={styles.card}
        >
          <Button
            title={t('inspector.job.directions')}
            size="md"
            variant="outline"
            onPress={onDirections}
            style={styles.button}
          />
        </KeyValueCard>

        {job.category === 'TWO_WHEELER' && !job.inspectionId ? (
          <InfoNote style={styles.card}>{t('inspector.job.twoWheelerNote')}</InfoNote>
        ) : null}

        <TitledCard title={t('inspector.job.inspection')} style={styles.card}>
          {inspection}
        </TitledCard>

        <TitledCard title={t('inspector.job.chatTitle')} style={styles.card}>
          <AppText variant="subtitle" style={styles.text}>
            {t(job.toDo ? 'inspector.job.chatHint' : 'inspector.job.chatClosed')}
          </AppText>
          <Button
            title={t('account.booking.chat.open')}
            size="md"
            variant="outline"
            disabled={!job.toDo}
            onPress={() => navigation.navigate(ROUTES.BOOKING_CHAT, { bookingId: job.id, withCustomer: true })}
            style={styles.button}
          />
        </TitledCard>
      </FadeIn>
      {dialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  time: {
    flex: 1,
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  text: {
    marginTop: spacing.xs,
    fontSize: fs(13),
    lineHeight: fs(19),
  },
  button: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default JobDetails;
