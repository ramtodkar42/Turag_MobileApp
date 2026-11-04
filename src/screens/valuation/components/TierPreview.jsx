import { StyleSheet, View } from 'react-native';
import { AppText, TierBadge } from '../../../components';
import { colors, fonts, spacing } from '../../../theme';
import { useT } from '../../../i18n';

// The published Turag Premium floor (the web's TIER_RULES.premium.minPriceMinor).
const PREMIUM_MIN_RUPEES = 1000000;

// Turag tier preview on an estimate (as the web's Evaluate result). An estimate isn't
// an inspection, so the car starts as Budget.
function TierPreview({ style }) {
  const t = useT();
  return (
    <View style={[styles.row, style]}>
      <AppText variant="label" color={colors.heading}>
        {t('valuation.tier.today')}
      </AppText>
      <TierBadge tier="BUDGET" size="md" />
    </View>
  );
}

// What moves the car up a tier. value: the estimated value in rupees.
export function TierNote({ value }) {
  const t = useT();
  return (
    <AppText variant="caption" color={colors.body}>
      {t('valuation.tier.assured1')} <AppText variant="caption" style={styles.strong}>{t('marketplace.tier.ASSURED')}</AppText>
      {t('valuation.tier.assured2')} {t(value >= PREMIUM_MIN_RUPEES ? 'valuation.tier.premiumHere' : 'valuation.tier.premiumNeeds')}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  strong: {
    fontFamily: fonts.subtitle.bold,
    color: colors.heading,
  },
});

export default TierPreview;
