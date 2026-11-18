import { useEffect, useRef, useState } from 'react';
import { AppState, StatusBar, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { MAX_CONTENT_WIDTH } from '../../../constants/layout';
import { ms } from '../../../utils/responsive';
import { barcodeScanner, isScannerAvailable, visionCamera } from '../../../utils/visionCamera';
import { handoverTokenFromQr } from '../../../api/services/handover.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import CameraPermission from '../../valuation/VehicleCamera/components/CameraPermission';
import CameraTopBar from '../../valuation/VehicleCamera/components/CameraTopBar';

// Only QR codes (a stable array: the scanner is rebuilt when it changes).
const FORMATS = ['qr-code'];
// How long "this isn't a Turag handover code" stays before scanning resumes.
const WRONG_CODE_MS = 2500;

// Camera paused when the screen is hidden or the app is in the background.
const useAppActive = () => {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
};

// The live scanner (only rendered when the camera and scanner libraries are in the build).
function LiveScanner({ onToken, onClose }) {
  const t = useT();
  const { Camera, useCameraDevice, useCameraPermission } = visionCamera;
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const permission = useCameraPermission();
  const device = useCameraDevice('back');
  const [wrong, setWrong] = useState(false);
  const handled = useRef(false);
  const wrongTimer = useRef(null);
  useEffect(() => () => clearTimeout(wrongTimer.current), []);

  // Ask for camera access the first time.
  const { canRequestPermission, requestPermission } = permission;
  useEffect(() => {
    if (canRequestPermission) requestPermission();
  }, [canRequestPermission, requestPermission]);

  const output = barcodeScanner.useBarcodeScannerOutput({
    barcodeFormats: FORMATS,
    onBarcodeScanned: barcodes => {
      if (handled.current || !barcodes?.length) return;
      const token = barcodes.map(b => handoverTokenFromQr(b.rawValue)).find(Boolean);
      if (token) {
        handled.current = true;
        onToken(token);
      } else if (!wrongTimer.current) {
        setWrong(true);
        wrongTimer.current = setTimeout(() => {
          wrongTimer.current = null;
          setWrong(false);
        }, WRONG_CODE_MS);
      }
    },
    onError: () => {},
  });

  return (
    <>
      <CameraTopBar onClose={onClose} hasTorch={false} />
      {permission.hasPermission ? (
        <View style={styles.preview}>
          {device ? (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isFocused && appActive}
              outputs={[output]}
            />
          ) : null}
          {/* Where to hold the code. */}
          <View style={styles.target} pointerEvents="none" />
          <View style={styles.hintBox} pointerEvents="none" accessibilityLiveRegion="polite">
            <AppText variant="label" align="center" color={colors.white}>
              {t(wrong ? 'handover.scan.notHandover' : 'handover.scan.hint')}
            </AppText>
          </View>
        </View>
      ) : (
        <CameraPermission canAsk={canRequestPermission} onRequest={requestPermission} onClose={onClose} />
      )}
    </>
  );
}

// The buyer scans the seller's handover QR in the app (ADR-0097); a good code opens the
// confirmation. Without the scanner in this build: "type the code instead".
// params: { orderId }
function HandoverScan({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const onToken = token => navigation.replace(ROUTES.HANDOVER_CONFIRM, { token });

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.frame}>
        {isScannerAvailable ? (
          <LiveScanner onToken={onToken} onClose={navigation.goBack} />
        ) : (
          <View style={styles.unavailable}>
            <AppText variant="h3" align="center" color={colors.white}>
              {t('handover.scan.title')}
            </AppText>
            <AppText variant="subtitle" align="center" color={colors.border}>
              {t('handover.scan.unavailable')}
            </AppText>
          </View>
        )}
        <Button
          title={t('handover.scan.typeInstead')}
          variant="lightOutline"
          size="md"
          onPress={navigation.goBack}
          style={styles.typeInstead}
        />
      </View>
    </View>
  );
}

const TARGET = ms(240);

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
  preview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  target: {
    width: TARGET,
    height: TARGET,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.white,
  },
  hintBox: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
  },
  unavailable: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  typeInstead: {
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
});

export default HandoverScan;
