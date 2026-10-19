import { StyleSheet } from 'react-native';
import { AppText, FadeIn, Header, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import ReceiptActions from '../receipt/ReceiptActions';
import ReceiptCard from '../receipt/ReceiptCard';
import useReceipt from '../receipt/useReceipt';

// A paid booking's receipt (the web's "View receipt" in My inspections), with
// Download receipt. params: { booking }
function BookingReceipt({ navigation, route }) {
  const t = useT();
  const { booking } = route.params;
  const receipt = useReceipt(booking);

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} title={t('account.receipt.screenTitle')} />}
      footer={<ReceiptActions receipt={receipt} />}
    >
      {receipt ? (
        <FadeIn>
          <ReceiptCard receipt={receipt} style={styles.card} />
          <AppText variant="caption" align="center" style={styles.note}>
            {t('account.receipt.footerNote')}
          </AppText>
        </FadeIn>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
  note: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontSize: fs(11.5),
    lineHeight: fs(17),
  },
});

export default BookingReceipt;
