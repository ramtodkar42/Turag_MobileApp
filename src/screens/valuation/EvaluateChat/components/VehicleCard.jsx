import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, KeyValueCard } from '../../../../components';
import { spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatRegNumber } from '../../../../utils/validators';
import { useT } from '../../../../i18n';
import { toDetailRows } from '../../components/vehicleRows';

// Details shown before "More details", so the card and Yes / No fit in one view.
const SHORT_ROWS = 4;

// The registry's vehicle for the plate: name, number, "Is this your vehicle?"
// and its main details (empty ones left out); "More details" shows the rest.
function VehicleCard({ vehicle }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const rows = toDetailRows(vehicle, t);
  const hasMore = rows.length > SHORT_ROWS;

  return (
    <KeyValueCard
      dense
      header={
        <View style={styles.header}>
          <AppText variant="h3" style={styles.name}>
            {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
            {vehicle.year ? `, ${vehicle.year}` : ''}
          </AppText>
          <AppText variant="caption">{formatRegNumber(vehicle.registrationNumber)}</AppText>
          <AppText variant="title" style={styles.question}>
            {t('valuation.confirm.question')}
          </AppText>
        </View>
      }
      rows={expanded ? rows : rows.slice(0, SHORT_ROWS)}
    >
      {hasMore ? (
        <Button
          title={t(expanded ? 'valuation.chat.lessDetails' : 'valuation.chat.moreDetails')}
          variant="ghost"
          size="sm"
          onPress={() => setExpanded(open => !open)}
          style={styles.more}
        />
      ) : null}
    </KeyValueCard>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  question: {
    marginTop: spacing.md,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  more: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: 0,
  },
});

export default VehicleCard;
