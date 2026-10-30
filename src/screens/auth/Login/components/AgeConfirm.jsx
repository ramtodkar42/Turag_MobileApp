import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, FadeIn, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "I confirm I am 18 years of age or older." (as the web's sign-in): a white
// tick box on the red Login screen. Signing in with the mobile number waits
// for it; `error` says so when a button is tapped first.
function AgeConfirm({ checked, onToggle, error, style }) {
  const t = useT();
  return (
    <View style={style}>
      <Pressable
        onPress={onToggle}
        hitSlop={HIT_SLOP}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? <Icon name="check" size={ms(14)} color={colors.primary} strokeWidth={3} /> : null}
        </View>
        <AppText variant="subtitle" color={colors.white} style={styles.text}>
          {t('auth.age.confirm')}
        </AppText>
      </Pressable>
      {error ? (
        <FadeIn offset={0}>
          <AppText variant="caption" color={colors.white} style={styles.error} accessibilityLiveRegion="polite">
            {t('auth.age.required')}
          </AppText>
        </FadeIn>
      ) : null}
    </View>
  );
}

const BOX = ms(22);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.white,
  },
  text: {
    flex: 1,
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: BOX + spacing.md,
    opacity: 0.9,
  },
});

export default AgeConfirm;
