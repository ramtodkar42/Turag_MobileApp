import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components';
import { colors, spacing } from '../../../theme';
import { useT } from '../../../i18n';

// The factors the valuation engine reports (its `adjustments`), each with a label in
// every app language. Any other factor is left out rather than shown as a raw code.
const KNOWN = new Set(['odometer_vs_expected', 'owner_count', 'declared_condition']);

export const knownFactors = adjustments => (adjustments ?? []).filter(a => KNOWN.has(a.factor));

// "How we worked this out" (as the web): each factor that moved the estimate and by how
// much, e.g. "Kilometres driven  -4%". factors: [{ factor, impactPct }] (knownFactors).
function PriceFactors({ factors }) {
  const t = useT();
  if (!factors?.length) {
    return null;
  }
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.heading}>
        {t('valuation.estimate.howWorked')}
      </AppText>
      {factors.map((f, i) => {
        let tone = colors.muted;
        if (f.impactPct > 0) tone = colors.success;
        if (f.impactPct < 0) tone = colors.danger;
        return (
          <View key={`${f.factor}-${i}`} style={styles.row}>
            <AppText variant="caption" color={colors.body} style={styles.flex}>
              {t(`valuation.factor.${f.factor}`)}
            </AppText>
            <AppText variant="caption" color={tone}>
              {`${f.impactPct > 0 ? '+' : ''}${f.impactPct}%`}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  flex: {
    flex: 1,
  },
});

export default PriceFactors;
