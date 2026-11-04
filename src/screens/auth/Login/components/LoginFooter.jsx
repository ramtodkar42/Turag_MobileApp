import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import TermsNote from './TermsNote';

// A small white text link on the red Login screen.
function FooterLink({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <AppText color={colors.white} style={styles.linkText}>
        {label}
      </AppText>
    </Pressable>
  );
}

// The Login screen's quiet bottom: "Email sign-in" (accounts Turag created, such as
// dealers, sign in with email + password), and the Terms / Privacy line right under it.
function LoginFooter({ onEmail, onTerms, onPrivacy, style }) {
  const t = useT();
  return (
    <View style={style}>
      <View style={styles.links}>
        <FooterLink label={t('auth.emailLogin.short')} onPress={onEmail} />
      </View>
      <TermsNote onTerms={onTerms} onPrivacy={onPrivacy} style={styles.terms} />
    </View>
  );
}

const styles = StyleSheet.create({
  links: {
    alignItems: 'center',
  },
  link: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  pressed: {
    opacity: 0.7,
  },
  terms: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    opacity: 0.85,
  },
});

export default LoginFooter;
