import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, FadeIn, GoogleMark } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const MARK = ms(32);

// Google sign-in found no Turag account yet: the account is the phone, so
// "Enter your mobile number to finish" (as the web). After the OTP the Google
// email is linked. email: the Google account's; onCancel: back to plain login.
function GooglePhoneNote({ email, onCancel, style }) {
  const t = useT();
  return (
    <FadeIn offset={0} style={[styles.box, style]}>
      <View style={styles.mark}>
        <GoogleMark size={ms(18)} />
      </View>
      <View style={styles.flex}>
        <AppText variant="label" color={colors.white} numberOfLines={1}>
          {email}
        </AppText>
        <AppText variant="caption" color={colors.white} style={styles.text}>
          {t('auth.google.needsPhone')}
        </AppText>
        <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={ms(8)} style={styles.cancel}>
          <AppText variant="caption" color={colors.white} style={styles.cancelText}>
            {t('auth.google.useAnother')}
          </AppText>
        </Pressable>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.whiteTranslucent,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  text: {
    marginTop: spacing.xxs,
  },
  cancel: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  cancelText: {
    textDecorationLine: 'underline',
  },
});

export default GooglePhoneNote;
