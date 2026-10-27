import { StyleSheet, View } from 'react-native';
import { AppText, Button, GoogleMark } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const MARK = ms(26);

// "or" and the "Continue with Google" button, on the red Login screen.
// busy: the Google sign-in is running; error: why it didn't work.
function GoogleSignIn({ busy, error, onPress, style }) {
  const t = useT();
  return (
    <View style={style}>
      <View style={styles.orRow}>
        <View style={styles.line} />
        <AppText variant="caption" color={colors.white}>
          {t('auth.google.or')}
        </AppText>
        <View style={styles.line} />
      </View>
      <Button
        title={t('auth.google.button')}
        variant="lightOutline"
        loading={busy}
        onPress={onPress}
        leftIcon={
          <View style={styles.mark}>
            <GoogleMark size={ms(16)} />
          </View>
        }
        style={styles.button}
      />
      {error ? (
        <AppText variant="caption" color={colors.white} align="center" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  button: {
    marginTop: spacing.md,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  error: {
    marginTop: spacing.sm,
  },
});

export default GoogleSignIn;
