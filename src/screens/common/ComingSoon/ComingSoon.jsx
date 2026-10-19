import { StyleSheet, View } from 'react-native';
import { Header, ScreenContainer, StatusView, useTabBarSpace } from '../../../components';
import { useT } from '../../../i18n';

// Placeholder for screens whose designs aren't built yet.
// As a tab: title = tab name. As a stack screen: pass { title, showBack } in params.
function ComingSoon({ navigation, route }) {
  const t = useT();
  const tabBarSpace = useTabBarSpace();
  const { title = route.name, showBack = false } = route.params ?? {};

  return (
    <ScreenContainer header={showBack ? <Header onBack={navigation.goBack} /> : null}>
      <View style={[styles.content, !showBack && { paddingBottom: tabBarSpace }]}>
        <StatusView title={title} message={t('common.comingSoonMessage')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});

export default ComingSoon;
