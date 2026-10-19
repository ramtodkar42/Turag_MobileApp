import { StyleSheet } from 'react-native';
import { AppText, Card } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';

// "Amount  ₹799/-" (green) and a line about the fee.
function AmountCard({ label, amount, description, style }) {
  return (
    <Card style={style}>
      <AppText variant="h3" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="h1" color={colors.success} style={styles.amount}>
        {amount}
      </AppText>
      {description ? (
        <AppText variant="subtitle" style={styles.description}>
          {description}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  amount: {
    marginTop: spacing.xs,
    fontSize: fs(28),
    lineHeight: fs(36),
  },
  description: {
    marginTop: spacing.xs,
    fontSize: fs(13),
    lineHeight: fs(19),
  },
});

export default AmountCard;
