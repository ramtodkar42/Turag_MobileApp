import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, CheckCircle } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// White pill at the top of the preview: the angle to shoot, then the result.
function AngleBadge({ title, status }) {
  const t = useT();
  let content = (
    <AppText variant="caption" color={colors.heading} style={styles.text}>
      {title}
    </AppText>
  );
  if (status === 'capturing' || status === 'checking') {
    content = (
      <>
        <ActivityIndicator size="small" color={colors.heading} />
        <AppText variant="caption" color={colors.heading} style={styles.text}>
          {status === 'capturing' ? t('valuation.camera.taking') : t('valuation.camera.checking')}
        </AppText>
      </>
    );
  } else if (status === 'perfect') {
    content = (
      <>
        <AppText variant="caption" color={colors.success} style={styles.text}>
          {t('valuation.camera.perfect')}
        </AppText>
        <CheckCircle size={ms(14)} />
      </>
    );
  } else if (status === 'incorrect') {
    content = (
      <AppText variant="caption" color={colors.danger} style={styles.text}>
        {t('valuation.camera.incorrect')}
      </AppText>
    );
  }

  return (
    <View style={styles.pill} accessibilityLiveRegion="polite">
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  text: {
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default AngleBadge;
