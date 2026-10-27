import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, radius, spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Ok / Verified -> success, Minor / In review -> warning, Major -> danger
const TONES = {
  success: { bg: colors.successLight, text: colors.success },
  verified: { bg: colors.success, text: colors.white },
  warning: { bg: colors.warningLight, text: colors.warning },
  danger: { bg: colors.dangerLight, text: colors.danger },
  neutral: { bg: colors.input, text: colors.body },
  // White pills for on top of photos (Garage cards).
  warningOnPhoto: { bg: colors.white, text: colors.warning },
  successOnPhoto: { bg: colors.white, text: colors.success },
  neutralOnPhoto: { bg: colors.white, text: colors.body },
};

// size: 'md' (default) | 'sm' (on top of photos, e.g. vehicle cards)
// icon: optional element before the label (e.g. a small tick)
// numberOfLines: cap the label (it then ends with "…" instead of wrapping)
function Badge({ label, tone = 'neutral', size = 'md', icon, numberOfLines, style }) {
  const t = TONES[tone];
  const small = size === 'sm';
  return (
    <View style={[styles.badge, small && styles.badgeSm, { backgroundColor: t.bg }, style]}>
      {icon}
      <AppText
        variant="caption"
        color={t.text}
        numberOfLines={numberOfLines}
        style={[styles.text, small && styles.textSm]}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  badgeSm: {
    gap: 4,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
  },
  text: {
    flexShrink: 1,
  },
  textSm: {
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default Badge;
