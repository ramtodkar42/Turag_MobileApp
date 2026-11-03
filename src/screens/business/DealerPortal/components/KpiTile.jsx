import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';

// One number on the dealer Overview: a label, the value and a short hint
// ("Live cars 12 · 2 in review"). The parent decides the width (grid).
function KpiTile({ label, value, hint, style }) {
  return (
    <View style={[styles.tile, style]} accessible accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}>
      <AppText variant="caption" numberOfLines={2}>
        {label}
      </AppText>
      <AppText variant="h3" color={colors.heading} style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" color={colors.body} numberOfLines={2} style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  value: {
    marginTop: spacing.xs,
    fontSize: fs(24),
    lineHeight: fs(30),
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default KpiTile;
