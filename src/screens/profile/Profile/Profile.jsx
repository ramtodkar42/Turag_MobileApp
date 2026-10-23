import { StyleSheet, View } from 'react-native';
import { AppText, MenuGroup, ScreenContainer, useTabBarSpace } from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { LANGUAGES, useLanguage, useT } from '../../../i18n';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { useSignedIn } from '../../../store/userStore';
import useMyOrganizations from '../../../hooks/useMyOrganizations';
import { PROFILE_MENU } from './menu';
import useAccountActions from './useAccountActions';

// The menu a guest sees: the same cards, without Log Out / Delete. Pages that
// need an account ask them to log in when opened (accountScreen).
const guestMenu = PROFILE_MENU.filter(group => !group.account);

// Profile tab: grouped settings menu (config in menu.js).
function Profile({ navigation }) {
  const t = useT();
  const signedIn = useSignedIn();
  // "Business accounts" only for members of a dealer / lender / yard organization.
  const { orgs } = useMyOrganizations();
  const hasOrgs = orgs.length > 0;
  const menu = (signedIn ? PROFILE_MENU : guestMenu).map(group => ({
    ...group,
    items: group.items.filter(item => !item.orgsOnly || hasOrgs),
  }));
  const language = useLanguage();
  const languageName = LANGUAGES.find(l => l.code === language)?.nativeName;
  const tabBarSpace = useTabBarSpace();
  const { confirm, dialog } = useConfirmDialog();
  const actions = useAccountActions(navigation, confirm);

  const onItemPress = item => {
    if (item.action) {
      actions[item.action]();
    } else if (item.web) {
      navigation.navigate(ROUTES.WEB_PAGE, { title: t(item.labelKey), path: item.web });
    } else if (item.route) {
      navigation.navigate(item.route);
    }
  };

  return (
    <ScreenContainer scroll contentStyle={{ paddingBottom: tabBarSpace }}>
      <AppText variant="h2" style={styles.title}>
        {t('profile.title')}
      </AppText>
      <View style={styles.groups}>
        {menu.map(group => (
          <MenuGroup
            key={group.titleKey}
            title={t(group.titleKey)}
            items={group.items.map(item => ({
              key: item.labelKey,
              label: t(item.labelKey),
              value: item.showsLanguage ? languageName : undefined,
              onPress: () => onItemPress(item),
            }))}
          />
        ))}
      </View>
      {dialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.lg,
    fontSize: fs(24),
    lineHeight: fs(30),
  },
  groups: {
    marginTop: spacing.lg,
    gap: spacing.xl,
  },
});

export default Profile;
