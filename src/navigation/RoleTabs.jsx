import { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { openWaitingPush, startPush } from '../push/pushNotifications';
import { TabBar } from '../components';
import { colors } from '../theme';
import { useT } from '../i18n';

const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
  sceneStyle: { backgroundColor: colors.white },
};

const renderTabBar = props => <TabBar {...props} />;

// Shared bottom tabs; each role passes its own list (see MainTabs / InspectorTabs).
// tab: { name, titleKey (i18n), icon (components/icons/iconPaths.js), component, opens? }
// `opens`: the tab doesn't switch; it opens this full-screen flow instead
// (flows with their own back button and bottom button, no tab bar).
function RoleTabs({ tabs, initialRouteName }) {
  const t = useT();

  // Signed in and past sign-up (the app's home is showing): turn on push, and
  // open a push that was tapped to launch / reopen the app.
  useEffect(() => {
    startPush();
    openWaitingPush();
  }, []);

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={screenOptions}
      initialRouteName={initialRouteName}
    >
      {tabs.map(({ name, titleKey, icon, component, opens }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{ title: t(titleKey), icon }}
          listeners={
            opens
              ? ({ navigation }) => ({
                  tabPress: e => {
                    e.preventDefault();
                    navigation.navigate(opens);
                  },
                })
              : undefined
          }
        />
      ))}
    </Tab.Navigator>
  );
}

export default RoleTabs;
