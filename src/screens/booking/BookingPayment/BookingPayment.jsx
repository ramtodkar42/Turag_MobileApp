import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Header, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';
import AmountCard from './components/AmountCard';
import PaymentOption from './components/PaymentOption';
import { DEFAULT_METHOD, PAYMENT_SECTIONS } from './paymentMethods';
import usePayBooking from './usePayBooking';

// Payment: the amount, how to pay (UPI / card / net banking), and "Pay ₹799",
// which books the inspection and pays its fee (see usePayBooking).
// params: the booking summary's params (+ payError when a payment failed).
function BookingPayment({ navigation, route }) {
  const t = useT();
  const { price } = route.params;
  const [method, setMethod] = useState(DEFAULT_METHOD);
  const { pay, busy, error } = usePayBooking({ navigation, route });
  const amount = price != null ? formatINR(price) : '—';

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <View style={styles.footer}>
          {error ? (
            <AppText variant="caption" color={colors.danger} align="center" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <Button
            title={t('booking.payment.pay', { amount })}
            onPress={() => pay(method)}
            loading={busy}
          />
        </View>
      }
    >
      <AmountCard
        label={t('booking.payment.amount')}
        amount={price != null ? `${amount}/-` : amount}
        description={t('booking.summary.payNow')}
        style={styles.amount}
      />

      {PAYMENT_SECTIONS.map(section => (
        <View key={section.titleKey} style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>
            {t(section.titleKey)}
          </AppText>
          <View style={styles.options} accessibilityRole="radiogroup">
            {section.methods.map(option => (
              <PaymentOption
                key={option.key}
                icon={option.icon}
                title={t(option.titleKey)}
                subtitle={t(option.subtitleKey)}
                selected={method === option.key}
                onPress={() => setMethod(option.key)}
              />
            ))}
          </View>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  amount: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  options: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  footer: {
    gap: spacing.sm,
  },
});

export default BookingPayment;
