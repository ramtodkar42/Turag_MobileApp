import { StyleSheet, View } from 'react-native';
import { AppText, Icon, PopIn } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// How each result looks: the account passed the automatic bank check
// (verified at once) or it went to Turag's team.
const KIND = {
  instant: { icon: 'check', color: colors.success, bg: colors.successLight, key: 'payouts.check.instant' },
  review: { icon: 'clock', color: colors.warning, bg: colors.warningLight, key: 'payouts.check.review' },
};

// Right after the proof is uploaded: what happened to the account.
// kind: 'instant' | 'review'.
function CheckNotice({ kind, style }) {
  const t = useT();
  const look = KIND[kind];
  if (!look) return null;
  return (
    <PopIn style={[styles.box, { backgroundColor: look.bg }, style]}>
      <View style={styles.icon}>
        <Icon name={look.icon} size={ms(14)} color={look.color} strokeWidth={2.5} />
      </View>
      <AppText variant="caption" color={colors.heading} style={styles.text}>
        {t(look.key)}
      </AppText>
    </PopIn>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  icon: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  text: {
    flex: 1,
  },
});

export default CheckNotice;
