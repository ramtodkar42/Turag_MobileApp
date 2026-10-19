import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { useT } from '../../../i18n';

const SHOWN = 4;

// The vehicle's details as small tiles, two per row (label over value): the
// first four, then "View all details" shows the rest.
// rows: [{ label, value }] (empty ones already left out).
function SpecGrid({ rows, style }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, SHOWN);

  return (
    <View style={style}>
      <View style={styles.grid}>
        {shown.map(row => (
          <Card key={row.label} style={styles.tile}>
            <AppText variant="caption" numberOfLines={1} style={styles.label}>
              {row.label}
            </AppText>
            <AppText variant="title" color={colors.heading} numberOfLines={2} style={styles.value}>
              {String(row.value)}
            </AppText>
          </Card>
        ))}
      </View>
      {rows.length > SHOWN ? (
        <Button
          title={t(all ? 'marketplace.details.fewer' : 'marketplace.details.all')}
          variant="ghost"
          size="sm"
          onPress={() => setAll(open => !open)}
          style={styles.toggle}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  // Two per row: each just under half, the gap between them.
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  value: {
    marginTop: spacing.xxs,
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  toggle: {
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
});

export default SpecGrid;
