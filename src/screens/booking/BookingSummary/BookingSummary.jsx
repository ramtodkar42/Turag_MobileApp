import { StyleSheet } from 'react-native';
import {
  Button,
  Header,
  HeaderCard,
  InfoNote,
  KeyValueCard,
  ScreenContainer,
} from '../../../components';
import { spacing } from '../../../theme';
import { formatINR } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';
import { useLanguage, useT } from '../../../i18n';
import { placeText, scheduleRows } from '../bookingRows';
import SummaryVehicle from './components/SummaryVehicle';

// Booking summary: the vehicle, when and where, what's ready on the day and
// the fee. "Pay ₹799" opens the payment screen (the booking is made there).
// params: { vehicle?, valuation?, category, address, slot, preparation, price }
function BookingSummary({ navigation, route }) {
  const t = useT();
  const language = useLanguage();
  const { vehicle, valuation, category, address, slot, preparation, price } = route.params;

  const ready = Object.entries(preparation)
    .filter(([, on]) => on)
    .map(([key]) => t(`booking.prepShort.${key}`));
  const fee = price != null ? formatINR(price) : '—';

  const detailRows = [
    // No vehicle picked (booked from My inspections): its type instead.
    ...(vehicle ? [] : [{ label: t('booking.summary.vehicle'), value: t(`booking.category.${category}`) }]),
    ...scheduleRows({ time: slot.time, place: placeText(address.area, address.city), t, language }),
    { label: t('booking.summary.ready'), value: ready.length ? ready.join(', ') : '—' },
  ];

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <Button
          title={price != null ? t('booking.payment.pay', { amount: fee }) : t('common.continue')}
          onPress={() => navigation.navigate(ROUTES.BOOKING_PAYMENT, route.params)}
        />
      }
    >
      <HeaderCard
        title={t('booking.summary.title')}
        subtitle={t('booking.summary.subtitle')}
        style={styles.card}
      />

      {vehicle ? <SummaryVehicle vehicle={vehicle} valuation={valuation} style={styles.card} /> : null}

      <KeyValueCard dense title={t('booking.summary.details')} rows={detailRows} style={styles.card} />

      <KeyValueCard
        dense
        title={t('booking.summary.paymentDetails')}
        rows={[
          { label: t('booking.summary.fee'), value: fee },
          { label: t('booking.summary.total'), value: fee },
        ]}
        style={styles.card}
      />

      <InfoNote style={styles.card}>{t('booking.summary.cancelNote')}</InfoNote>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
});

export default BookingSummary;
