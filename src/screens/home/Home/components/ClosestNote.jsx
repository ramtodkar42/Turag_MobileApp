import { StyleSheet, View } from 'react-native';
import { AppText, FadeIn, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Over the grid when nothing matched the search exactly and the closest
// vehicles show instead (as the web's "closest matches").
function ClosestNote({ style }) {
  const t = useT();
  return (
    <FadeIn offset={0} style={[styles.note, style]}>
      <View style={styles.icon}>
        <Icon name="search" size={ms(15)} color={colors.warning} strokeWidth={2} />
      </View>
      <View style={styles.text} accessibilityLiveRegion="polite">
        <AppText variant="label" color={colors.heading}>
          {t('home.smart.closestTitle')}
        </AppText>
        <AppText variant="caption" color={colors.body}>
          {t('home.smart.closestText')}
        </AppText>
      </View>
    </FadeIn>
  );
}

const ICON = ms(32);

const styles = StyleSheet.create({
  note: {
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

export default ClosestNote;
