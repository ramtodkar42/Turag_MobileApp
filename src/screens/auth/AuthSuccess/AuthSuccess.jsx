import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, CheckCircle, FadeIn, Icon, PopIn, ScreenContainer, StatusView } from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';

const NEXT_SCREEN_DELAY = 2000;
// With the email note there's more to read before moving on.
const EMAIL_NOTE_DELAY = 6000;

// After sign-up (as the web): the verification link was emailed - tap it any
// time - or couldn't be sent now (resend it from Personal Information).
// notice: { email, sent }.
function EmailNote({ notice }) {
  const t = useT();
  return (
    <FadeIn style={styles.note}>
      <View style={styles.noteIcon}>
        <Icon name="message" size={ms(18)} color={notice.sent ? colors.primary : colors.warning} />
      </View>
      <AppText variant="caption" color={colors.body} style={styles.noteText}>
        {t(notice.sent ? 'auth.email.sent' : 'auth.email.deferred', { email: notice.email })}
      </AppText>
    </FadeIn>
  );
}

// Green tick after a successful OTP, then the user's home. A new account with
// an email also says where the verification link went, with "Continue".
// params: { titleKey: 'auth.loginSuccessful' | 'auth.accountCreated' (or a ready `title`), next: home route (by role),
//   goBack?: a guest logged in from the app - close, back to the screen they were on,
//   emailNotice?: { email, sent } - from Create Account,
//   thenOpen?: a screen to open on top of home (a dealer: their Business section) }
function AuthSuccess({ navigation, route }) {
  const t = useT();
  const { titleKey, title: readyTitle, goBack, emailNotice, thenOpen } = route.params ?? {};
  const title = titleKey ? t(titleKey) : readyTitle ?? t('auth.loginSuccessful');
  const next = route.params?.next ?? ROUTES.MAIN_TABS;

  // Moves on once - by itself after a moment, or on Continue, whichever comes first.
  const left = useRef(false);
  const proceed = useCallback(() => {
    if (left.current) return;
    left.current = true;
    // A dealer's Business section comes first, even after signing in from a guest screen.
    if (thenOpen) navigation.reset({ index: 1, routes: [{ name: next }, { name: thenOpen }] });
    else if (goBack && navigation.canGoBack()) navigation.goBack();
    else navigation.replace(next);
  }, [navigation, next, goBack, thenOpen]);

  useEffect(() => {
    const timer = setTimeout(proceed, emailNotice ? EMAIL_NOTE_DELAY : NEXT_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [proceed, emailNotice]);

  return (
    <ScreenContainer>
      <StatusView
        icon={
          <PopIn>
            <CheckCircle size={ms(84)} />
          </PopIn>
        }
        title={title}
        message={t('auth.success.message')}
      >
        {emailNotice ? (
          <>
            <EmailNote notice={emailNotice} />
            <Button title={t('common.continue')} onPress={proceed} style={styles.continue} />
          </>
        ) : null}
      </StatusView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.input,
  },
  noteIcon: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  noteText: {
    flex: 1,
  },
  continue: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
});

export default AuthSuccess;
