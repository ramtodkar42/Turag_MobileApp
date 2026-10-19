import { StyleSheet, View } from 'react-native';
import { AppText, KeyValueCard, ValueCard } from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';
import { toPriceBandRows } from './vehicleRows';

// A price estimate: the big value (ValueCard) with the vehicle's name, then
// the "Price bands" card. Same on the first estimate, the updated one and
// the result. valuation may be null ("Not available yet", no bands).
// label: the small heading over the value (default "Pre-Estimated Value").
function EstimateSummary({ vehicle, valuation, label, description, style }) {
  const t = useT();
  const hasValue = valuation?.estimatedValue != null;

  return (
    <View style={style}>
      <ValueCard
        label={label}
        value={hasValue ? `${formatINR(valuation.estimatedValue)}/-` : t('valuation.result.noValue')}
        title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        description={description}
      />

      {valuation?.priceBands ? (
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
