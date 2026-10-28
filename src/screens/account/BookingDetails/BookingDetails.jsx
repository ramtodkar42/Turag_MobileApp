import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  Header,
  InfoNote,
  PaymentNotice,
  ScreenContainer,
  StatusTimeline,
  StatusView,
  TitledCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { cityLabel } from '../../../utils/address';
import { formatINR } from '../../../utils/format';
import useRemoteData from '../../../hooks/useRemoteData';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { cancelMyBooking, getMyBooking } from '../../../api/services/booking.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { BOOKING_STATUS, BOOKING_STEPS } from '../statuses';
import ActionPanel from './components/ActionPanel';
import BookingHero from './components/BookingHero';
import InspectionDetailsCard from './components/InspectionDetailsCard';
import usePayAgain from './usePayAgain';

// Fee still to pay (as the web's booking page): not paid, and not over.
const PAYABLE_UNTIL = new Set(['CANCELLED', 'FULFILLED']);

// A booked doorstep inspection (opened from its notifications), same as the
// web's booking page: status, when / where / fee, "Pay now" while the fee is
// unpaid, progress, the report once it's ready, chat with the inspector, and
// Cancel while it's still allowed.
// params: { bookingId, booking? } - `booking` is the one just paid for when the
// payment wasn't confirmed yet (the backend doesn't list unpaid bookings).
function BookingDetails({ navigation, route }) {
  const t = useT();
  const { bookingId, booking: passed } = route.params;
  const load = useCallback(async () => {
    try {
      return await getMyBooking(bookingId);
    } catch (e) {
      if (e?.code === 'BOOKING_NOT_FOUND' && passed?.id === bookingId) return passed;
      throw e;
    }
  }, [bookingId, passed]);
  const { data: booking, setData, loading, refreshing, error, errorCode, refresh, reload } =
    useRemoteData(load, [bookingId]);
  const { confirm, dialog } = useConfirmDialog();
  const [actionError, setActionError] = useState('');
  const payment = usePayAgain({ booking, onPaid: reload });

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
  const payable = !booking.feePaid && !PAYABLE_UNTIL.has(booking.status);
  const kind = t(`account.booking.kind.${booking.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`);
  // "Flat 402, Sunshine Society, Viman Nagar, Pune - 411001 (near X Mall)", as the web's receipt.
  const city = booking.cityCode ? cityLabel(booking.cityCode) : booking.city;
  const place =
    [booking.building, booking.address, [city, booking.pincode].filter(Boolean).join(' - ')]
      .filter(Boolean)
      .join(', ') + (booking.landmark ? ` (${booking.landmark})` : '');

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

        {payable ? (
          <ActionPanel
            icon="rupee"
            title={t('account.booking.pay.title')}
            text={t('account.booking.pay.text')}
            button={{
              title: payment.busy
                ? t('account.booking.pay.paying')
                : payment.failed
                ? t('account.booking.pay.retry')
                : t('account.booking.pay.button', { amount: booking.price != null ? formatINR(booking.price) : '' }),
              loading: payment.busy,
              onPress: payment.pay,
            }}
            style={styles.card}
          >
            {payment.note ? (
              <AppText
                variant="caption"
                color={colors.body}
                style={styles.payNote}
                accessibilityLiveRegion="polite"
              >
                {payment.note.text}
              </AppText>
            ) : null}
            <PaymentNotice problem={payment.problem} style={styles.payNote} />
          </ActionPanel>
        ) : null}

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
  payNote: {
    marginTop: spacing.sm,
  },
});

export default BookingDetails;
