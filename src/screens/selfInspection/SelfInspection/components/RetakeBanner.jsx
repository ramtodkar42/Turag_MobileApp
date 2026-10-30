import { StyleSheet, View } from 'react-native';
import { AppText, FadeIn, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { itemName, shotName } from '../labels';

// After "Retake photos": which photos the photo check flagged and still need
// taking again. They're also listed in "Before you can submit", and Submit
// waits for them. shots: si.retakeShots; items: si.allItems.
function RetakeBanner({ shots, items, style }) {
  const t = useT();
  if (!shots?.length) {
    return null;
  }
  const names = shots.map(({ code, shotCode }) => {
    const item = items.find(i => i.item_code === code);
    return shotCode && shotCode !== code ? shotName(t, shotCode) : itemName(t, item) || code;
  });
  return (
    <FadeIn offset={0} style={[styles.banner, style]}>
      <View style={styles.icon}>
        <Icon name="camera" size={ms(16)} color={colors.warning} strokeWidth={2} />
      </View>
      <View style={styles.text} accessibilityLiveRegion="polite">
        <AppText variant="label" color={colors.heading}>
          {t('selfInspection.retake.title', { count: names.length })}
        </AppText>
        <AppText variant="caption" color={colors.body}>
          {[...new Set(names)].join(', ')}
        </AppText>
      </View>
    </FadeIn>
  );
}

const ICON = ms(32);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  text: {
    flex: 1,
    gap: ms(2),
  },
});

export default RetakeBanner;
