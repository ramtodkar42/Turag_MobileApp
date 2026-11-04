import { StyleSheet, View } from 'react-native';
import { AppText, Card, KeyValueCard, ValueCard } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';
import { toPriceBandRows } from './vehicleRows';

// A price estimate: the big value (ValueCard) with the vehicle's name, then
// the "Price bands" card. Same on the first estimate, the updated one and
// the result. valuation may be null ("Not available yet", no bands).
// label: the small heading over the value (default "Pre-Estimated Value").
// bands: the full band table (the inspection report); otherwise the two figures a
// seller acts on, as the web: what a dealer pays and what a private buyer pays.
function EstimateSummary({ vehicle, valuation, label, description, bands = false, style }) {
  const t = useT();
  const hasValue = valuation?.estimatedValue != null;
  const figures = !bands && hasValue ? sellerFigures(valuation) : null;

  return (
    <View style={style}>
      <ValueCard
        label={label ?? (figures ? t('valuation.estimate.dealerPays') : undefined)}
        value={hasValue ? `${formatINR(valuation.estimatedValue)}/-` : t('valuation.result.noValue')}
        title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        description={description}
      />

      {figures?.dealer ? (
        <AppText variant="caption" style={styles.range}>
          {t('valuation.estimate.range', { low: formatINR(figures.dealer.low), high: formatINR(figures.dealer.high) })}
        </AppText>
      ) : null}

      {figures?.privateSale ? (
        <Card style={styles.bands}>
          <AppText variant="caption" color={colors.heading}>
            {t('valuation.estimate.privateSale')}
          </AppText>
          <AppText variant="h2" color={colors.success} style={styles.privateValue}>
            {formatINR(figures.privateSale.value)}
          </AppText>
          <AppText variant="caption">
            {t('valuation.estimate.range', { low: formatINR(figures.privateSale.low), high: formatINR(figures.privateSale.high) })}
          </AppText>
          <AppText variant="caption" style={styles.privateHelp}>
            {t('valuation.estimate.privateHelp')}
          </AppText>
        </Card>
      ) : null}

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

// From the server's bands; no price math beyond the midpoint (to the nearest ₹100).
export const sellerFigures = ({ priceBands }) => {
  const { auction, tradeIn, retail } = priceBands ?? {};
  return {
    dealer: auction?.min != null && tradeIn?.max != null ? { low: auction.min, high: tradeIn.max } : null,
    privateSale:
      retail?.min != null && retail?.max != null
        ? { value: Math.round((retail.min + retail.max) / 2 / 100) * 100, low: retail.min, high: retail.max }
        : null,
  };
};

const styles = StyleSheet.create({
  range: {
    marginTop: spacing.sm,
  },
  privateValue: {
    marginTop: spacing.xs,
  },
  privateHelp: {
    marginTop: spacing.sm,
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
