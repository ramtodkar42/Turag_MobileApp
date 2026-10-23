import { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { openWaitingPush, startPush } from '../push/pushNotifications';
import { TabBar } from '../components';
import { colors } from '../theme';
import { useT } from '../i18n';
import { useSignedIn } from '../store/userStore';
import { requireLogin } from '../store/loginPromptStore';

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
// `loginReason`: that flow needs an account - a guest is asked to log in.
function RoleTabs({ tabs, initialRouteName }) {
  const t = useT();
  const signedIn = useSignedIn();

  // Signed in and past sign-up (the app's home is showing): turn on push, and
  // open a push that was tapped to launch / reopen the app. Guests get no
  // pushes; this runs as soon as they log in.
  useEffect(() => {
    if (signedIn) {
      startPush();
      openWaitingPush();
    }
  }, [signedIn]);

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={screenOptions}
      initialRouteName={initialRouteName}
    >
      {tabs.map(({ name, titleKey, icon, component, opens, loginReason }) => (
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
                    if (!loginReason || requireLogin(loginReason)) {
                      navigation.navigate(opens);
                    }
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
