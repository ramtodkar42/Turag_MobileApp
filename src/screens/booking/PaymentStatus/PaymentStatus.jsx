import { StyleSheet } from 'react-native';
import { InfoNote, ScreenContainer, Spinner, StatusView } from '../../../components';
import { spacing } from '../../../theme';
import { useT } from '../../../i18n';
import usePaymentStatus from './usePaymentStatus';

// "Hold On - we are verifying your payment status": shown while the fee is
// paid and checked (see usePaymentStatus). No back button.
// params: { booking } - the booking being paid (PENDING_PAYMENT)
function PaymentStatus({ navigation, route }) {
  const t = useT();
  usePaymentStatus({ navigation, booking: route.params.booking });

  return (
    <ScreenContainer footer={<InfoNote>{t('booking.payment.dontLeave')}</InfoNote>}>
      <StatusView
        icon={<Spinner />}
        title={t('booking.payment.holdOn')}
        message={t('booking.payment.verifying')}
        style={styles.status}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  status: {
    paddingBottom: spacing.xxl,
  },
});

export default PaymentStatus;
