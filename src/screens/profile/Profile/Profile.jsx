import { StyleSheet, View } from 'react-native';
import { AppText, MenuGroup, ScreenContainer, useTabBarSpace } from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { LANGUAGES, useLanguage, useT } from '../../../i18n';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { PROFILE_MENU } from './menu';
import useAccountActions from './useAccountActions';

// Profile tab: grouped settings menu (config in menu.js).
function Profile({ navigation }) {
  const t = useT();
  const language = useLanguage();
  const languageName = LANGUAGES.find(l => l.code === language)?.nativeName;
  const tabBarSpace = useTabBarSpace();
  const { confirm, dialog } = useConfirmDialog();
  const actions = useAccountActions(navigation, confirm);

  const onItemPress = item => {
    if (item.action) {
      actions[item.action]();
    } else if (item.route) {
      navigation.navigate(item.route);
    } else {
      navigation.navigate(ROUTES.PROFILE_SECTION, { title: t(item.labelKey), showBack: true });
    }
  };

  return (
    <ScreenContainer scroll contentStyle={{ paddingBottom: tabBarSpace }}>
      <AppText variant="h2" style={styles.title}>
        {t('profile.title')}
      </AppText>
      <View style={styles.groups}>
        {PROFILE_MENU.map(group => (
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
