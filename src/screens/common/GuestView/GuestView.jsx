import { StyleSheet, View } from 'react-native';
import { AppText, Button, Header, Icon, ScreenContainer, useTabBarSpace } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';

const CIRCLE = ms(96);
const BUTTON_WIDTH = ms(320);

// A tab or page that needs an account, as a guest sees it: its title, an icon,
// what it's for, and "Log in or sign up" (back on this page after logging in).
// withBack: a page opened from somewhere (back button in the header) rather
// than a tab (big title, room for the tab bar).
function GuestView({ navigation, titleKey, icon, headingKey, messageKey, withBack = false }) {
  const t = useT();
  const tabBarSpace = useTabBarSpace();
  return (
    <ScreenContainer
      header={withBack ? <Header onBack={navigation.goBack} title={t(titleKey)} /> : null}
      contentStyle={withBack ? styles.page : { paddingBottom: tabBarSpace }}
    >
      {withBack ? null : (
        <AppText variant="h2" style={styles.title}>
          {t(titleKey)}
        </AppText>
      )}
      <View style={styles.body}>
        <View style={styles.circle}>
          <Icon name={icon} size={ms(40)} color={colors.primary} />
        </View>
        <AppText variant="h3" align="center" style={styles.heading}>
          {t(headingKey)}
        </AppText>
        <AppText variant="subtitle" align="center" style={styles.message}>
          {t(messageKey)}
        </AppText>
        <Button
          title={t('guest.logIn')}
          onPress={() => navigation.navigate(ROUTES.LOGIN, { fromGuest: true })}
          style={styles.button}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.lg,
    fontSize: fs(24),
    lineHeight: fs(30),
  },
  // Sits a little above the middle, like the tab version.
  page: {
    paddingBottom: ms(56),
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  heading: {
    marginTop: spacing.xl,
    fontSize: fs(19),
    lineHeight: fs(25),
  },
  message: {
    marginTop: spacing.xs,
    maxWidth: BUTTON_WIDTH,
  },
  button: {
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: BUTTON_WIDTH,
  },
});

export default GuestView;
