import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '../../../../components';
import { colors } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { useT } from '../../../../i18n';

// "Have an email & password? Sign in here" (white on the red Login screen, as
// the web's sign-in sheet) - for accounts Turag created, e.g. dealers.
function EmailLoginLink({ onPress, style }) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      <AppText variant="caption" color={colors.white} align="center">
        {t('auth.emailLogin.linkPrefix')}{' '}
        <AppText variant="caption" color={colors.white} style={styles.link}>
          {t('auth.emailLogin.link')}
        </AppText>
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});

export default EmailLoginLink;
