import { StyleSheet, View } from 'react-native';
import {
  Button,
  CheckCircle,
  FadeIn,
  Header,
  HeaderCard,
  PopIn,
  ScreenContainer,
} from '../../../components';
import { spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { BOOKING_STATUS } from '../../account/statuses';
import ReceiptCard from '../../account/receipt/ReceiptCard';
import useReceipt from '../../account/receipt/useReceipt';
import ReceiptLink from './components/ReceiptLink';

// "Booking confirmed" (after paying): the confirmation, the booking's receipt
// (as the web's, with its status) in one view, Download receipt and "Track
// the inspection" (its page). History is Home -> here, so Back returns Home.
// params: { booking } - the paid booking
function BookingConfirmed({ navigation, route }) {
  const t = useT();
  const { booking } = route.params;
  const receipt = useReceipt(booking);
  const status = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.REQUESTED;

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <View style={styles.footer}>
          <ReceiptLink receipt={receipt} />
          <Button
            title={t('booking.confirmed.track')}
            onPress={() => navigation.replace(ROUTES.BOOKING_DETAILS, { bookingId: booking.id })}
          />
        </View>
      }
    >
      <PopIn>
        <HeaderCard
          title={t('booking.confirmed.title')}
          subtitle={t(booking.inspectorAssigned ? 'booking.confirmed.assigned' : 'booking.confirmed.subtitle')}
          right={<CheckCircle size={ms(24)} />}
          style={styles.card}
        />
      </PopIn>

      {receipt ? (
        <FadeIn>
          <ReceiptCard receipt={receipt} status={t(status.labelKey)} style={styles.receipt} />
        </FadeIn>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  receipt: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  footer: {
    gap: spacing.xs,
  },
});

export default BookingConfirmed;
