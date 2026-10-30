import { useEffect, useRef } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '../../../components';
import { colors, spacing } from '../../../theme';
import { MAX_CONTENT_WIDTH } from '../../../constants/layout';
import { isCameraAvailable } from '../../../utils/visionCamera';
import { useT } from '../../../i18n';
import LiveCamera from './components/LiveCamera';

const RETURN_DELAY = 800; // let the user see "Perfect Angle" first

// Guided camera for the vehicle photos (designs 28-37).
// params: { shot: { key, title }, returnTo: route name }
// After a good shot it goes back to `returnTo` with { captured: { key, file } }.
function VehicleCamera({ navigation, route }) {
  const t = useT();
  const { shot, returnTo } = route.params;
  const insets = useSafeAreaInsets();

  // Closing the camera during the short "Perfect angle" pause cancels the
  // photo (it's never sent back), and leaving the screen clears the timer.
  const returning = useRef(null);
  useEffect(() => () => clearTimeout(returning.current), []);
  const onCaptured = file => {
    clearTimeout(returning.current);
    returning.current = setTimeout(
      () => navigation.popTo(returnTo, { captured: { key: shot.key, file } }, { merge: true }),
      RETURN_DELAY,
    );
  };
  const close = () => {
    clearTimeout(returning.current);
    navigation.goBack();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.frame}>
        {isCameraAvailable ? (
          <LiveCamera shot={shot} onCaptured={onCaptured} onClose={close} />
        ) : (
          <View style={styles.unavailable}>
            <AppText variant="h3" align="center" color={colors.white}>
              {t('valuation.camera.unavailableTitle')}
            </AppText>
            <AppText variant="subtitle" align="center" color={colors.border}>
              {t('valuation.camera.unavailableMessage')}
            </AppText>
            <Button title={t('common.back')} onPress={navigation.goBack} style={styles.back} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  unavailable: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  back: {
    marginTop: spacing.lg,
  },
});

export default VehicleCamera;
