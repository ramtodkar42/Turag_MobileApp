import { StyleSheet, View } from 'react-native';
import { AppText, VehicleRow } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { formatRegNumber } from '../../../../utils/validators';
import { useT } from '../../../../i18n';

// The vehicle being inspected: photo, name, year · fuel, registration and
// its pre-estimated value (when there is one).
function SummaryVehicle({ vehicle, valuation, style }) {
  const t = useT();
  const value = valuation?.estimatedValue;
  const meta = [vehicle.year, vehicle.fuel].filter(Boolean).join(' · ');

  return (
    <VehicleRow
      image={vehicle.image ?? null}
      title={[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
      subtitle={meta || null}
      style={style}
    >
      {vehicle.registrationNumber ? (
        <AppText variant="label" color={colors.heading} style={styles.reg}>
          {formatRegNumber(vehicle.registrationNumber)}
        </AppText>
      ) : null}
      {value != null ? (
        <View style={styles.value}>
          <AppText variant="caption" color={colors.heading} style={styles.small}>
            {t('common.preEstimatedValue')}
          </AppText>
          <AppText variant="label" color={colors.success}>
            {`${formatINR(value)}/-`}
          </AppText>
        </View>
      ) : null}
    </VehicleRow>
  );
}

const styles = StyleSheet.create({
  reg: {
    marginTop: spacing.xxs,
    fontSize: fs(12),
  },
  value: {
    marginTop: spacing.xs,
  },
  small: {
    fontSize: fs(11),
  },
});

export default SummaryVehicle;
