import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import TermsNote from './TermsNote';

// A small white text link on the red Login screen.
function FooterLink({ label, onPress, chevron = false }) {
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
      {chevron ? <Icon name="chevronRight" size={ms(14)} color={colors.white} strokeWidth={2.2} /> : null}
    </Pressable>
  );
}

// The Login screen's quiet bottom: "Browse cars without login ›" | "Email
// sign-in" on one line (they wrap neatly on a narrow screen / longer
// language), and the Terms / Privacy line right under it.
// onBrowse: null hides the browse link (a guest opened Login from inside the
// app); onEmail: accounts Turag created (dealers) sign in with email + password.
function LoginFooter({ onBrowse, onEmail, onTerms, onPrivacy, style }) {
  const t = useT();
  return (
    <View style={style}>
      <View style={styles.links}>
        {onBrowse ? <FooterLink label={t('guest.browse')} onPress={onBrowse} chevron /> : null}
        {onBrowse ? <View style={styles.divider} /> : null}
        <FooterLink label={t('auth.emailLogin.short')} onPress={onEmail} />
      </View>
      <TermsNote onTerms={onTerms} onPrivacy={onPrivacy} style={styles.terms} />
    </View>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: spacing.xs,
    columnGap: spacing.md,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(2),
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  divider: {
    width: StyleSheet.hairlineWidth * 2,
    height: ms(14),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
