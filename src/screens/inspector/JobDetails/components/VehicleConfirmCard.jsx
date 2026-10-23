import { StyleSheet, View } from 'react-native';
import { AppText, Badge, KeyValueCard } from '../../../../components';
import { spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatRegNumber } from '../../../../utils/validators';
import { useT } from '../../../../i18n';
import { confirmRows } from './confirmRows';

// "Is this the vehicle?" (as the web's M2 card): the registry's name for it,
// whether it's a verified registry record or a live lookup, and its details.
// The buttons go below it (children).
function VehicleConfirmCard({ vehicle, plate, children, style }) {
  const t = useT();
  return (
    <KeyValueCard
      dense
      header={
        <View style={styles.header}>
          <Badge
            label={t(vehicle.fromCache ? 'inspector.start.fromCache' : 'inspector.start.liveLookup')}
            tone={vehicle.fromCache ? 'success' : 'neutral'}
            size="sm"
            style={styles.badge}
          />
          <AppText variant="h3" style={styles.name}>
            {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
          </AppText>
          <AppText variant="caption">{formatRegNumber(plate)}</AppText>
          <AppText variant="title" style={styles.question}>
            {t('inspector.start.isThis')}
          </AppText>
        </View>
      }
      rows={confirmRows(vehicle, t)}
      style={style}
    >
      {children}
    </KeyValueCard>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  question: {
    marginTop: spacing.sm,
    fontSize: fs(14),
    lineHeight: fs(19),
  },
});

export default VehicleConfirmCard;
