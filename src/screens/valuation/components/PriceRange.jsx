import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';

// The estimate as ONE price range, as the web (owner rule, 5 Nov 2026, like Spinny and
// Cars24): no dealer price label, no second figure, no confidence. The range comes from
// the server's bands (auction low to trade-in high); nothing is calculated here.
// Returns { low, high } or null.
export const priceRange = valuation => {
  const { auction, tradeIn } = valuation?.priceBands ?? {};
  return auction?.min != null && tradeIn?.max != null ? { low: auction.min, high: tradeIn.max } : null;
};

// "Estimated value", the range, "Most likely around ₹X", and a bar with a dot where the
// most likely price sits. range: { low, high }. value: the most likely price (rupees).
// label: the small heading (default "Estimated value").
function PriceRange({ range, value, label }) {
  const t = useT();
  const span = Math.max(1, range.high - range.low);
  const at = Math.min(1, Math.max(0, (value - range.low) / span));

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color={colors.muted}>
        {label ?? t('common.estimatedValue')}
      </AppText>
      <AppText variant="h2" color={colors.heading} style={styles.range}>
        {`${formatINR(range.low)} – ${formatINR(range.high)}`}
      </AppText>
      <AppText variant="caption" color={colors.body}>
        {t('valuation.estimate.likely', { value: formatINR(value) })}
      </AppText>
      <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.dot, { left: `${at * 100}%` }]} />
      </View>
    </View>
  );
}

const DOT = ms(14);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
  },
  range: {
    fontSize: fs(22),
    lineHeight: fs(28),
  },
  bar: {
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginHorizontal: DOT / 2,
  },
  dot: {
    position: 'absolute',
    top: (ms(6) - DOT) / 2,
    width: DOT,
    height: DOT,
    marginLeft: -DOT / 2,
    borderRadius: DOT / 2,
    backgroundColor: colors.white,
    borderWidth: ms(3),
    borderColor: colors.primary,
  },
});

export default PriceRange;
