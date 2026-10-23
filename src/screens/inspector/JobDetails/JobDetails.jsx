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
import { isJobExpired } from '../constants';
import StartInspection from './components/StartInspection';

// One job (as the web's job page): when and where (with directions to the
// pinned spot), the inspection - start it on site, or continue it; an expired
// one can't be started (ops must reschedule) - and chat with the customer.
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

  const expired = isJobExpired(job);
  const status = BOOKING_STATUS[job.status] ?? BOOKING_STATUS.REQUESTED;
  const kind = t(`account.booking.kind.${job.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`);
  const place = [job.address, [job.city, job.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  // Where, as the web: the building / flat first, the landmark last.
  const where = [job.building, place].filter(Boolean).join(', ') + (job.landmark ? ` (${job.landmark})` : '');
  // Chat stays open until the booking ends (as the web).
  const chatClosed = job.status === 'CANCELLED' || job.status === 'FULFILLED';
  let chatHintKey = 'inspector.job.chatHint';
  if (chatClosed) {
    chatHintKey = job.status === 'CANCELLED' ? 'inspector.job.chatCancelled' : 'inspector.job.chatDone';
  }
  // The shared M1 / M2 capture screen.
  const openCapture = inspectionId => navigation.navigate(ROUTES.SELF_INSPECTION, { inspectionId, bookingId: job.id });

  // The customer's map pin gets the inspector to the exact doorstep; the text
  // address only when no pin was set.
  const onDirections = async () => {
    if (!(await openDirections({ location: job.location, address: place }))) {
      confirm({
        title: t('inspector.accepted.openMapsFailed'),
        message: t('inspector.accepted.openFailedMessage'),
        confirmLabel: t('common.ok'),
        cancelLabel: null,
      });
    }
  };

  // As the web: complete, then expired (never started; checked after
  // complete so a started visit never reads as expired), then in progress
  // (continue), then assigned (start).
  let inspection;
  if (job.status === 'FULFILLED') {
    inspection = (
      <AppText variant="subtitle" style={styles.text}>
        {t('inspector.job.complete')}
      </AppText>
    );
  } else if (expired && job.status !== 'ON_SITE' && !job.inspectionId) {
    inspection = (
      <>
        <AppText variant="title" style={styles.text}>
          {t('inspector.job.expiredTitle')}
        </AppText>
        <AppText variant="subtitle" style={styles.text}>
          {t('inspector.job.expiredMessage')}
        </AppText>
        <Button
          title={t('inspector.submitted.back')}
          size="md"
          variant="outline"
          onPress={navigation.goBack}
          style={styles.button}
        />
      </>
    );
  } else if (job.status === 'ON_SITE' || job.inspectionId) {
    inspection = (
      <>
        <AppText variant="subtitle" style={styles.text}>
          {t('inspector.job.inProgress')}
        </AppText>
        {job.inspectionId ? (
          <Button
            title={t('inspector.jobs.continue')}
            size="md"
            onPress={() => openCapture(job.inspectionId)}
            style={styles.button}
          />
        ) : null}
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
        // The server says the slot lapsed: reload so the page shows it as expired.
        onExpired={reload}
      />
    );
  } else {
    inspection = (
      <AppText variant="subtitle" style={styles.text}>
        {t('inspector.job.notStartable')}
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
            <Badge
              label={expired ? t('inspector.jobs.expiredBadge') : t(status.labelKey)}
              tone={expired ? 'neutral' : status.tone}
            />
          </View>
          <AppText variant="label">{t('account.booking.heading', { kind })}</AppText>
        </Card>

        <KeyValueCard
          dense
          rows={[
            { label: t('account.booking.where'), value: where || '—' },
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

        {job.category === 'TWO_WHEELER' && job.status === 'ASSIGNED' && !job.inspectionId && !expired ? (
          <InfoNote style={styles.card}>{t('inspector.job.twoWheelerNote')}</InfoNote>
        ) : null}

        <TitledCard title={t('inspector.job.inspection')} style={styles.card}>
          {inspection}
        </TitledCard>

        <TitledCard title={t('inspector.job.chatTitle')} style={styles.card}>
          <AppText variant="subtitle" style={styles.text}>
            {t(chatHintKey)}
          </AppText>
          <Button
            title={t('account.booking.chat.open')}
            size="md"
            variant="outline"
            disabled={chatClosed}
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
