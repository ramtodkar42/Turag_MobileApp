import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, Icon, Spinner } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { formatINR } from '../../../../utils/format';

const inr = minor => formatINR(Math.round(minor / 100));
const CONFIDENCE_LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH']);

// "Estimated value" (the web's EstimateCard) in the app's green value style
// (like ValueCard): the value, the likely range on a band (placed in a +-35%
// window around the value) and the confidence; otherwise `emptyText`.
// Amounts in paise.
function EstimateCard({ valueMinor, lowerMinor, upperMinor, confidenceLevel, vehicleLabel, emptyText, footnote, loading }) {
  const t = useT();
  let band = null;
  if (valueMinor != null && lowerMinor != null && upperMinor != null && valueMinor > 0) {
    const lo = valueMinor * 0.65;
    const span = valueMinor * 0.7;
    const clamp = x => Math.min(Math.max(x, 0), 100);
    band = { left: clamp(((lowerMinor - lo) / span) * 100), right: clamp(100 - ((upperMinor - lo) / span) * 100) };
  }
  const level = String(confidenceLevel ?? '').toUpperCase();
  return (
    <Card>
      <View style={styles.labelRow}>
        <AppText variant="caption" color={colors.heading} style={styles.label}>
          {t('selfInspection.estimate.title')}
        </AppText>
        <Icon name="trendUp" size={ms(12)} color={colors.heading} strokeWidth={2} />
        {confidenceLevel && valueMinor != null && !loading ? (
          <Badge
            size="sm"
            tone="success"
            label={CONFIDENCE_LEVELS.has(level) ? t(`selfInspection.estimate.confidence.${level}`) : confidenceLevel}
            style={styles.badge}
          />
        ) : null}
      </View>
      {loading ? (
        <View style={styles.loading}>
          <Spinner size={ms(24)} />
          <AppText variant="subtitle">{t('selfInspection.estimate.calculating')}</AppText>
        </View>
      ) : valueMinor != null ? (
        <>
          <AppText variant="h1" color={colors.success} style={styles.value}>
            {inr(valueMinor)}
          </AppText>
          {lowerMinor != null && upperMinor != null ? (
            <>
              <View style={styles.band}>
                {band ? <View style={[styles.bandFill, { left: `${band.left}%`, right: `${band.right}%` }]} /> : null}
              </View>
              <AppText variant="caption" color={colors.heading}>
                {t('selfInspection.estimate.range', { low: inr(lowerMinor), high: inr(upperMinor) })}
              </AppText>
            </>
          ) : null}
        </>
      ) : (
        <AppText variant="subtitle" style={styles.empty}>
          {emptyText}
        </AppText>
      )}
      <AppText variant="h3" style={styles.vehicle}>
        {vehicleLabel}
      </AppText>
      <AppText variant="caption" style={styles.footnote}>
        {footnote}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fs(11),
  },
  badge: {
    marginLeft: 'auto',
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  value: {
    marginVertical: spacing.xs,
    fontSize: fs(28),
    lineHeight: fs(36),
  },
  band: {
    height: ms(6),
    marginTop: spacing.xxs,
    marginBottom: spacing.xs,
    borderRadius: ms(3),
    backgroundColor: colors.successLight,
  },
  bandFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: ms(3),
    backgroundColor: colors.success,
  },
  empty: {
    marginVertical: spacing.sm,
    fontSize: fs(14),
    lineHeight: fs(20),
  },
  vehicle: {
    marginTop: spacing.sm,
    fontSize: fs(16),
    lineHeight: fs(22),
  },
  footnote: {
    marginTop: spacing.xxs,
    fontSize: fs(11.5),
    lineHeight: fs(16),
  },
});

export default EstimateCard;
