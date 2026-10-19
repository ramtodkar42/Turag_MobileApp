import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { AppText } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { visionCamera } from '../../../../utils/visionCamera';
import { useT } from '../../../../i18n';
import useAngleCapture from '../useAngleCapture';
import AngleBadge from './AngleBadge';
import CameraControls from './CameraControls';
import CameraPermission from './CameraPermission';
import CameraTopBar from './CameraTopBar';
import ZoomSelector from './ZoomSelector';

const ZOOM_LEVELS = [1, 2];

// Android reports "Camera is not active" when zoom/flash arrive while the camera
// is still starting or already stopping. Harmless (the next start applies them),
// so it's not shown; any other camera error is.
const isHarmlessCameraError = error =>
  /not active|OperationCanceled/i.test(String(error?.message ?? error));

// Camera is paused when the screen is hidden or the app is in the background.
const useAppActive = () => {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
};

// The live camera. Only rendered when react-native-vision-camera is available
// (see utils/visionCamera.js). Calls onCaptured(file) after a good shot.
// shot: { key, title }
function LiveCamera({ shot, onCaptured, onClose }) {
  const { Camera, CommonResolutions, useCameraDevice, useCameraPermission, usePhotoOutput } =
    visionCamera;
  const t = useT();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const permission = useCameraPermission();

  const [position, setPosition] = useState('back');
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [running, setRunning] = useState(false); // camera started and not stopped
  const [cameraError, setCameraError] = useState('');

  const device = useCameraDevice(position);
  // Front (selfie) cameras usually have no flash; sending any torch value to
  // them crashes with "No flash unit", so the torch is only used when present.
  const hasTorch = !!device?.hasTorch;
  const photoOutput = usePhotoOutput({ targetResolution: CommonResolutions.FHD_4_3, quality: 0.85 });
  const { status, error, capture } = useAngleCapture({
    photoOutput,
    angleKey: shot.key,
    flashOn: torchOn && !!device?.hasFlash,
  });

  // Ask for camera access the first time.
  const { canRequestPermission, requestPermission } = permission;
  useEffect(() => {
    if (canRequestPermission) {
      requestPermission();
    }
  }, [canRequestPermission, requestPermission]);

  const zoomLevels = ZOOM_LEVELS.filter(
    level => !device || (level >= device.minZoom && level <= device.maxZoom),
  );

  const onCapture = async () => {
    const file = await capture();
    if (file) {
      onCaptured(file);
    }
  };

  const flip = () => {
    setTorchOn(false);
    setZoom(1);
    setRunning(false); // the new camera reports onStarted again
    setCameraError('');
    setPosition(p => (p === 'back' ? 'front' : 'back'));
  };

  const busy = ['capturing', 'checking', 'perfect'].includes(status);

  return (
    <>
      <CameraTopBar
        onClose={onClose}
        torchOn={torchOn}
        onToggleTorch={() => setTorchOn(on => !on)}
        hasTorch={hasTorch}
      />

      {permission.hasPermission ? (
        <>
          <View style={styles.preview}>
            {device ? (
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isFocused && appActive}
                outputs={[photoOutput]}
                // Only send zoom / flash while the camera is running.
                zoom={running ? zoom : undefined}
                torchMode={running && hasTorch ? (torchOn ? 'on' : 'off') : undefined}
                onStarted={() => setRunning(true)}
                onStopped={() => setRunning(false)}
                onError={e => {
                  if (!isHarmlessCameraError(e)) {
                    setCameraError(e.message || t('valuation.camera.stopped'));
                  }
                }}
                enableNativeTapToFocusGesture
              />
            ) : (
              <AppText variant="subtitle" align="center" color={colors.border} style={styles.noDevice}>
                {t('valuation.camera.noDevice')}
              </AppText>
            )}
            <AngleBadge title={shot.title} status={status} />
            <ZoomSelector levels={zoomLevels} value={zoom} onChange={setZoom} />
          </View>

          {error || cameraError ? (
            <AppText variant="caption" align="center" color={colors.danger} style={styles.error}>
              {error || cameraError}
            </AppText>
          ) : null}

          <CameraControls onCapture={onCapture} onFlip={flip} disabled={busy || !device} />
        </>
      ) : (
        <CameraPermission
          canAsk={permission.canRequestPermission}
          onRequest={permission.requestPermission}
          onClose={onClose}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.heading,
  },
  noDevice: {
    marginTop: '50%',
  },
  error: {
    marginTop: spacing.sm,
  },
});

export default LiveCamera;
