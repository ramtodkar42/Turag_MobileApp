import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, isTablet } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { formatMinor } from '../useSettlements';

// One figure in the strip; `dark` is the headline paid-out figure (as the web).
function Stat({ label, value, sub, dark, style }) {
  return (
    <View style={[styles.stat, dark && styles.dark, style]}>
      <AppText variant="caption" color={colors.placeholder} style={styles.label}>
        {label}
      </AppText>
      <AppText
        variant="h3"
        color={dark ? colors.white : colors.heading}
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      <AppText variant="caption" color={dark ? colors.border : colors.body} style={styles.sub}>
        {sub}
      </AppText>
    </View>
  );
}

// The three-stat summary over the ledger: Paid to you, Awaiting payout, Ledger
// entries. Phones: the paid figure across the top, the other two below it;
// tablets: all three in a row.
// summary: { paidMinor, heldMinor, count }.
function SettlementSummary({ summary, style }) {
  const t = useT();
  return (
    <View style={[styles.strip, isTablet && styles.row, style]}>
      <Stat
        dark
        label={t('payouts.settle.paidLabel')}
        value={formatMinor(summary.paidMinor)}
        sub={t('payouts.settle.paidSub')}
        style={isTablet && styles.flex}
      />
      <View style={[styles.row, styles.flex]}>
        <Stat
          label={t('payouts.settle.pendingLabel')}
          value={formatMinor(summary.heldMinor)}
          sub={t('payouts.settle.pendingSub')}
          style={styles.flex}
        />
        <Stat
          label={t('payouts.settle.ledgerLabel')}
          value={String(summary.count)}
          sub={t('payouts.settle.ledgerSub')}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A hairline gap between the stats on the border colour, like the web's grid.
  strip: {
    gap: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    gap: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
  },
  stat: {
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  dark: {
    backgroundColor: colors.black,
  },
  label: {
    fontSize: fs(10),
    lineHeight: fs(14),
    letterSpacing: fs(1),
    textTransform: 'uppercase',
  },
  value: {
    marginTop: spacing.sm,
    fontSize: fs(22),
    lineHeight: fs(28),
  },
  sub: {
    marginTop: spacing.xs,
    fontSize: fs(11.5),
    lineHeight: fs(16),
  },
});

export default SettlementSummary;
