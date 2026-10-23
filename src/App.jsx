import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RNBootSplash from 'react-native-bootsplash';
import RootNavigator from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';
import useAppBoot from './hooks/useAppBoot';
import PushBanner from './push/PushBanner';
import OfflineBanner from './components/feedback/OfflineBanner';
import SplashScreen from './screens/common/SplashScreen';
import LoginPrompt from './screens/auth/LoginPrompt/LoginPrompt';

function App() {
  const boot = useAppBoot();

  // Hand off from the native splash to our JS splash (SplashScreen) as soon as
  // React is up, so the branded launch screen (TURAG logo) shows while the app
  // finishes booting. Guarded for builds that don't have the native module.
  useEffect(() => {
    try {
      RNBootSplash.hide({ fade: true }).catch(() => {});
    } catch {
      // Native module not in this build yet: the JS splash still shows.
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {boot.ready ? (
        <>
          <NavigationContainer ref={navigationRef} onReady={boot.onNavigationReady}>
            <RootNavigator initialRoute={boot.initialRoute} />
          </NavigationContainer>
          {/* Guests: "Log in to continue" when they try something that needs an account. */}
          <LoginPrompt />
          {/* On top of every screen: a push that arrives while the app is open. */}
          <PushBanner />
          {/* A slim bar when the device loses its connection. */}
          <OfflineBanner />
        </>
      ) : (
        // Branded launch screen (TURAG logo) while the saved session is read.
        <SplashScreen />
      )}
    </SafeAreaProvider>
  );
}

export default App;
