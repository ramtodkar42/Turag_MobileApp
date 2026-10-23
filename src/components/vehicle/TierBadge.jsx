import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import { colors, fonts, radius, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// Turag Budget / Assured / Premium (as the web's TierBadge): Premium is black
// and gold, Assured green, Budget neutral - a pill with a dot.
// tier: 'BUDGET' | 'ASSURED' | 'PREMIUM'; size: 'sm' (cards) | 'md' (vehicle page);
// short: just "Premium" (tight spots like the grid card), else "Turag Premium".
const LOOK = {
  PREMIUM: { bg: colors.tierPremium, fg: colors.tierPremiumText, border: colors.tierPremium, dot: colors.tierPremiumText },
  ASSURED: { bg: colors.tierAssured, fg: colors.tierAssuredText, border: colors.tierAssuredBorder, dot: colors.tierAssuredDot },
  BUDGET: { bg: colors.input, fg: colors.body, border: colors.border, dot: colors.placeholder },
};

function TierBadge({ tier, size = 'sm', short = false, style }) {
  const t = useT();
  const look = LOOK[tier];
  if (!look) {
    return null;
  }
  const md = size === 'md';
  const label = t(short ? `marketplace.tier.short.${tier}` : `marketplace.tier.${tier}`);
  return (
    <View
      style={[styles.pill, md && styles.pillMd, { backgroundColor: look.bg, borderColor: look.border }, style]}
      accessibilityLabel={t(`marketplace.tier.${tier}`)}
    >
      <View style={[styles.dot, md && styles.dotMd, { backgroundColor: look.dot }]} />
      <AppText color={look.fg} numberOfLines={1} style={[styles.text, md && styles.textMd]}>
        {label}
      </AppText>
    </View>
  );
}

const DOT = ms(6);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: ms(5),
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  pillMd: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: ms(5),
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  dotMd: {
    width: ms(7),
    height: ms(7),
    borderRadius: ms(3.5),
  },
  text: {
    fontFamily: fonts.title.bold,
    fontSize: fs(10),
    lineHeight: fs(14),
  },
  textMd: {
    fontSize: fs(13),
    lineHeight: fs(17),
  },
});

export default TierBadge;
