import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "Payments are coming soon" (as the web's /book): the slots and the price are
// real, but online payment isn't open yet, so nothing can be booked. A soft
// amber card with a way to go on now: inspect the vehicle yourself.
function PaymentsSoonCard({ onInspectYourself, style }) {
  const t = useT();
  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      <View style={styles.row}>
        <Icon name="clock" size={ms(18)} color={colors.warning} />
        <AppText variant="title" style={styles.title}>
          {t('booking.paySoon.title')}
        </AppText>
      </View>
      <AppText variant="caption" color={colors.body} style={styles.body}>
        {t('booking.paySoon.body')}
      </AppText>
      <Button
        title={t('booking.paySoon.cta')}
        size="sm"
        variant="outline"
        onPress={onInspectYourself}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  body: {
    marginTop: spacing.xs,
  },
  action: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
});

export default PaymentsSoonCard;
