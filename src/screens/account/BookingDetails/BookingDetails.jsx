import { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  Header,
  InfoNote,
  ScreenContainer,
  StatusTimeline,
  StatusView,
  TitledCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { cityLabel } from '../../../utils/address';
import useRemoteData from '../../../hooks/useRemoteData';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { cancelMyBooking, getMyBooking } from '../../../api/services/booking.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { BOOKING_STATUS, BOOKING_STEPS } from '../statuses';
import ActionPanel from './components/ActionPanel';
import BookingHero from './components/BookingHero';
import InspectionDetailsCard from './components/InspectionDetailsCard';

// A booked doorstep inspection (opened from its notifications), same as the
// web's booking page: status, when / where / fee, progress, the report once
// it's ready, chat with the inspector, and Cancel while it's still allowed.
// params: { bookingId }
function BookingDetails({ navigation, route }) {
  const t = useT();
  const { bookingId } = route.params;
  const { data: booking, setData, loading, refreshing, error, errorCode, refresh, reload } =
    useRemoteData(() => getMyBooking(bookingId), [bookingId]);
  const { confirm, dialog } = useConfirmDialog();
  const [actionError, setActionError] = useState('');

  const header = <Header onBack={navigation.goBack} title={t('account.booking.title')} />;

  if (loading) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[2, 3, 4]} style={styles.card} />
      </ScreenContainer>
    );
  }
  if (error) {
    const notFound = errorCode === 'BOOKING_NOT_FOUND';
    return (
      <ScreenContainer header={header}>
        <StatusView
          title={t(notFound ? 'account.booking.notFound.title' : 'account.booking.error.title')}
          message={notFound ? t('account.booking.notFound.message') : error}
        >
          <Button
            title={notFound ? t('common.back') : t('common.retry')}
            size="md"
            onPress={notFound ? navigation.goBack : reload}
            style={styles.action}
          />
        </StatusView>
      </ScreenContainer>
    );
  }

  const status = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.REQUESTED;
  const cancelled = booking.status === 'CANCELLED';
  const kind = t(`account.booking.kind.${booking.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`);
  // "Apollo Clinic, Viman Nagar, Pune - 411001"
  const city = booking.cityCode ? cityLabel(booking.cityCode) : booking.city;
  const place = [booking.address, [city, booking.pincode].filter(Boolean).join(' - ')]
    .filter(Boolean)
    .join(', ');

  const onCancel = () =>
    confirm({
      title: t('account.booking.cancel.title'),
      message: t('account.booking.cancel.message'),
      confirmLabel: t('account.booking.cancel.confirm'),
      cancelLabel: t('account.booking.cancel.keep'),
      onConfirm: async () => {
        setActionError('');
        try {
          setData(await cancelMyBooking(booking.id));
        } catch (e) {
          setActionError(e.message || t('account.booking.cancel.error'));
          reload();
        }
      },
    });

  let chatHint = t('account.booking.chat.hint');
  if (cancelled) {
    chatHint = t('account.booking.chat.cancelled');
  } else if (booking.status === 'FULFILLED') {
    chatHint = t('account.booking.chat.done');
  } else if (!booking.inspectorAssigned) {
    chatHint = t('account.booking.chat.waiting');
  }

  return (
    <ScreenContainer
      scroll
      header={header}
      refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
      footer={
        booking.canCancel ? (
          <Button title={t('account.booking.cancel.button')} variant="outline" onPress={onCancel} />
        ) : null
      }
    >
      <FadeIn>
        <BookingHero
          title={t('account.booking.heroTitle', { kind })}
          bookingId={booking.id}
          status={{ label: t(status.labelKey), tone: status.tone }}
          style={styles.card}
        />

        <InspectionDetailsCard
          booking={booking}
          place={place}
          onViewReceipt={() => navigation.navigate(ROUTES.BOOKING_RECEIPT, { booking })}
          style={styles.card}
        />

        {cancelled ? (
          <InfoNote style={styles.card}>{t('account.booking.cancelledNote')}</InfoNote>
        ) : (
          <TitledCard title={t('account.booking.progress')} style={styles.card}>
            <StatusTimeline
              steps={BOOKING_STEPS.map(step => t(`account.booking.step.${step}`))}
              currentStep={Math.max(0, BOOKING_STEPS.indexOf(booking.status))}
              style={styles.timeline}
            />
          </TitledCard>
        )}

        {booking.inspectionId || booking.status === 'FULFILLED' ? (
          <ActionPanel
            icon="document"
            title={t('account.booking.report.title')}
            text={t(booking.inspectionId ? 'account.booking.report.ready' : 'account.booking.report.preparing')}
            button={
              booking.inspectionId
                ? {
                    title: t('account.booking.report.view'),
                    onPress: () =>
                      navigation.navigate(ROUTES.INSPECTION_REPORT, { inspectionId: booking.inspectionId }),
                  }
                : null
            }
            style={styles.card}
          />
        ) : null}

        <ActionPanel
          icon="message"
          title={t('account.booking.chat.title')}
          text={chatHint}
          button={{
            title: t('account.booking.chat.open'),
            disabled: !booking.chatOpen,
            onPress: () => navigation.navigate(ROUTES.BOOKING_CHAT, { bookingId: booking.id }),
          }}
          style={styles.card}
        />

        {actionError ? (
          <AppText variant="caption" color={colors.danger} style={styles.card}>
            {actionError}
          </AppText>
        ) : null}
      </FadeIn>
      {dialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  timeline: {
    marginTop: spacing.md,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default BookingDetails;
