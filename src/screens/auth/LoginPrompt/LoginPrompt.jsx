import { StyleSheet, View } from 'react-native';
import { AppText, BottomSheet, Button, Icon } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { navigationRef } from '../../../navigation/navigationRef';
import { ROUTES } from '../../../navigation/routes';
import { closeLoginPrompt, useLoginPromptReason } from '../../../store/loginPromptStore';
import { useT } from '../../../i18n';

// What the guest was trying to do: the sheet's icon and message.
const LOGIN_REASONS = {
  save: { icon: 'heart', messageKey: 'guest.prompt.save' },
  offer: { icon: 'tag', messageKey: 'guest.prompt.offer' },
  notifications: { icon: 'bell', messageKey: 'guest.prompt.notifications' },
  evaluate: { icon: 'document', messageKey: 'guest.prompt.evaluate' },
};
const FALLBACK = { icon: 'user', messageKey: 'guest.prompt.default' };

const CIRCLE = ms(64);

// "Log in to continue" sheet for guests (opened by requireLogin, mounted once
// in App). "Log in or sign up" opens Login over the current screen; after
// logging in the guest comes straight back to it (resetAfterSignIn).
function LoginPrompt() {
  const t = useT();
  const reason = useLoginPromptReason();
  const { icon, messageKey } = LOGIN_REASONS[reason] ?? FALLBACK;

  const logIn = () => {
    closeLoginPrompt();
    if (navigationRef.isReady()) {
      navigationRef.navigate(ROUTES.LOGIN, { fromGuest: true });
    }
  };

  return (
    <BottomSheet visible={!!reason} onClose={closeLoginPrompt}>
      <View style={styles.content}>
        <View style={styles.circle}>
          <Icon name={icon} size={ms(28)} color={colors.primary} />
        </View>
        <AppText variant="h3" align="center" style={styles.title}>
          {t('guest.prompt.title')}
        </AppText>
        <AppText variant="subtitle" align="center" style={styles.message}>
          {t(messageKey)}
        </AppText>
      </View>
      <Button title={t('guest.logIn')} onPress={logIn} />
      <Button
        title={t('guest.notNow')}
        variant="ghost"
        onPress={closeLoginPrompt}
        style={styles.later}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  title: {
    marginTop: spacing.lg,
    fontSize: fs(19),
    lineHeight: fs(25),
  },
  message: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  later: {
    marginTop: spacing.xs,
  },
});

export default LoginPrompt;
