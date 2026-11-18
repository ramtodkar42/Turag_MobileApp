import { StyleSheet, View } from 'react-native';
import { AppText, Card, KeyValueCard, ValueCard } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';
import { toPriceBandRows } from './vehicleRows';
import PriceRange, { priceRange } from './PriceRange';
import PriceFactors, { knownFactors } from './PriceFactors';

// A price estimate with the vehicle's name. Same on the first estimate, the updated
// one and the result. valuation may be null ("Not available yet", no bands).
// - Default: ONE price range with the most likely price (owner rule, 5 Nov 2026, as the
//   web: no dealer label, no second figure, no confidence), and how it was worked out.
// - bands: the big value and the full band table (the inspection report).
// label: the small heading over the price (default "Estimated value").
function EstimateSummary({ vehicle, valuation, label, description, bands = false, style }) {
  const t = useT();
  const hasValue = valuation?.estimatedValue != null;
  const range = !bands && hasValue ? priceRange(valuation) : null;
  const title = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;

  return (
    <View style={style}>
      {range ? (
        <Card style={styles.rangeCard}>
          <AppText variant="title">{title}</AppText>
          <PriceRange range={range} value={valuation.estimatedValue} label={label} />
          {description ? (
            <AppText variant="caption" color={colors.body}>
              {description}
            </AppText>
          ) : null}
          <PriceFactors factors={knownFactors(valuation.adjustments)} />
        </Card>
      ) : (
        <ValueCard
          label={label ?? t('common.estimatedValue')}
          value={hasValue ? `${formatINR(valuation.estimatedValue)}/-` : t('valuation.result.noValue')}
          title={title}
          description={description}
        />
      )}

      {bands && valuation?.priceBands ? (
        <KeyValueCard
          dense
          header={
            <AppText variant="h3" style={styles.bandsTitle}>
              {t('valuation.details.priceBands')}
            </AppText>
          }
          rows={toPriceBandRows(valuation.priceBands, t)}
          style={styles.bands}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rangeCard: {
    gap: spacing.sm,
  },
  bands: {
    marginTop: spacing.lg,
  },
  bandsTitle: {
    fontSize: fs(16),
    lineHeight: fs(22),
    marginBottom: spacing.xs,
  },
});

export default EstimateSummary;
