import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button } from '../../../components';
import { colors, fonts, radius, spacing } from '../../../theme';
import { MAX_CONTENT_WIDTH } from '../../../constants/layout';
import { fs, ms } from '../../../utils/responsive';
import { isCameraAvailable, visionCamera } from '../../../utils/visionCamera';
import { useT } from '../../../i18n';
import CameraPermission from '../../valuation/VehicleCamera/components/CameraPermission';
import CameraTopBar from '../../valuation/VehicleCamera/components/CameraTopBar';
import { clipLength } from './clipLength';
import { videoBitRate } from './videoBitRate';

// 720p, compressed by the clip's longest length (videoBitRate): the 2-minute
// walkaround comes to about 36 MB, clear enough to review and quick to send.
const TICK_MS = 250;

const clock = seconds => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

// Records one required video with the in-app camera: the timer against the item's
// length, stops by itself at the longest. Goes back to `returnTo` with
// { recorded: { key, file, minS, maxS } } - nothing is sent until the owner has
// watched it and accepted it.
// params: { slot: { key, title, minS?, maxS? }, returnTo }
function VideoRecorder({ navigation, route }) {
  const t = useT();
  const { slot, returnTo } = route.params;
  const insets = useSafeAreaInsets();
  const onRecorded = (file, duration) =>
    navigation.popTo(
      returnTo,
      { recorded: { key: slot.key, minS: slot.minS, maxS: slot.maxS, file: { ...file, duration } } },
      { merge: true },
    );

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.frame}>
        {isCameraAvailable ? (
          <LiveRecorder slot={slot} onRecorded={onRecorded} onClose={navigation.goBack} />
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

function LiveRecorder({ slot, onRecorded, onClose }) {
  const { Camera, CommonResolutions, useCameraDevice, useCameraPermission, useMicrophonePermission, useVideoOutput } =
    visionCamera;
  const t = useT();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const camera = useCameraPermission();
  const mic = useMicrophonePermission();
  const device = useCameraDevice('back');
  const hasTorch = !!device?.hasTorch;
  const [torchOn, setTorchOn] = useState(false);
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const recorder = useRef(null);
  const startedAt = useRef(0);
  // The recorder's own count of what's in the file (seconds, bytes), read while it
  // records: the clip's real length, as the web reads it from the file. A stopwatch
  // would also count the camera starting and the file being finished, so a clip
  // stopped at the limit could be refused as too long.
  const recorded = useRef({ seconds: 0, bytes: 0 });
  const readRecorder = () => {
    const live = recorder.current;
    const seconds = live?.recordedDuration;
    const bytes = live?.recordedFileSize;
    if (Number.isFinite(seconds) && seconds > 0) recorded.current.seconds = seconds;
    if (Number.isFinite(bytes) && bytes > 0) recorded.current.bytes = bytes;
  };
  // The sound is part of the evidence (the engine note), so it's recorded when allowed.
  const videoOutput = useVideoOutput({
    targetResolution: CommonResolutions.HD_16_9,
    targetBitRate: videoBitRate(slot.maxS),
    enableAudio: mic.hasPermission,
    fileType: 'mp4',
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  const { canRequestPermission: askCamera, requestPermission: requestCamera } = camera;
  const { canRequestPermission: askMic, requestPermission: requestMic } = mic;
  useEffect(() => {
    if (askCamera) {
      requestCamera();
    } else if (askMic) {
      requestMic();
    }
  }, [askCamera, requestCamera, askMic, requestMic]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => {
      readRecorder();
      setElapsed(recorded.current.seconds || (Date.now() - startedAt.current) / 1000);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [recording]);

  // Leaving while recording throws the clip away.
  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.cancelRecording().catch(() => {});
      }
    },
    [],
  );

  const start = async () => {
    setError('');
    try {
      const next = await videoOutput.createRecorder({ maxDuration: slot.maxS });
      recorder.current = next;
      recorded.current = { seconds: 0, bytes: 0 };
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      await next.startRecording(
        (filePath, reason) => {
          const duration = clipLength({
            reason,
            maxS: slot.maxS,
            recordedSeconds: recorded.current.seconds, // read as Stop was pressed
            clockSeconds: (Date.now() - startedAt.current) / 1000,
          });
          recorder.current = null;
          setRecording(false);
          onRecorded(
            {
              uri: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
              fileName: `${slot.key.replace(/\W/g, '_')}.mp4`,
              type: 'video/mp4',
              ...(recorded.current.bytes > 0 ? { fileSize: recorded.current.bytes } : null),
            },
            duration,
          );
        },
        e => {
          recorder.current = null;
          setRecording(false);
          setError(e?.message || t('selfInspection.recorder.failed'));
        },
      );
      // Resolves once recording has really begun: the clock starts here.
      startedAt.current = Date.now();
    } catch (e) {
      recorder.current = null;
      setRecording(false);
      setError(e?.message || t('selfInspection.recorder.failed'));
    }
  };

  const stop = () => {
    readRecorder(); // its count reads 0 once it has stopped
    recorder.current?.stopRecording().catch(e => setError(e?.message || t('selfInspection.recorder.failed')));
  };

  const tooShort = slot.minS != null && elapsed < slot.minS;

  return (
    <>
      <CameraTopBar onClose={onClose} torchOn={torchOn} onToggleTorch={() => setTorchOn(on => !on)} hasTorch={hasTorch} />
      {camera.hasPermission ? (
        <>
          <View style={styles.preview}>
            {device ? (
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isFocused && appActive}
                outputs={[videoOutput]}
                torchMode={running && hasTorch ? (torchOn ? 'on' : 'off') : undefined}
                onStarted={() => setRunning(true)}
                onStopped={() => setRunning(false)}
                onError={e => setError(e?.message || t('selfInspection.recorder.failed'))}
              />
            ) : (
              <AppText variant="subtitle" align="center" color={colors.border} style={styles.noDevice}>
                {t('valuation.camera.noDevice')}
              </AppText>
            )}
            <View style={styles.badge}>
              <AppText style={styles.title} numberOfLines={1}>
                {slot.title}
              </AppText>
              <AppText style={styles.timer}>
                {slot.maxS ? `${clock(elapsed)} / ${clock(slot.maxS)}` : clock(elapsed)}
              </AppText>
            </View>
          </View>

          <View style={styles.controls}>
            {error ? (
              <AppText variant="caption" align="center" color={colors.danger}>
                {error}
              </AppText>
            ) : recording && tooShort ? (
              <AppText variant="caption" align="center" color={colors.border}>
                {t('selfInspection.recorder.keepGoing', { min: slot.minS })}
              </AppText>
            ) : null}
            <Pressable
              onPress={recording ? stop : start}
              disabled={!device || !running || (recording && tooShort)}
              accessibilityRole="button"
              accessibilityLabel={t(recording ? 'selfInspection.recorder.stop' : 'selfInspection.recorder.start')}
              style={[styles.shutter, (!device || !running || (recording && tooShort)) && styles.shutterOff]}
            >
              <View style={recording ? styles.stopMark : styles.recordMark} />
            </Pressable>
          </View>
        </>
      ) : (
        <CameraPermission canAsk={camera.canRequestPermission} onRequest={camera.requestPermission} onClose={onClose} />
      )}
    </>
  );
}

const SHUTTER = ms(72);

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
  preview: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.black,
  },
  noDevice: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.overlay,
  },
  title: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13),
    lineHeight: fs(18),
    color: colors.white,
  },
  timer: {
    fontFamily: fonts.title.bold,
    fontSize: fs(18),
    lineHeight: fs(24),
    color: colors.white,
  },
  controls: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: {
    opacity: 0.5,
  },
  recordMark: {
    width: SHUTTER - ms(20),
    height: SHUTTER - ms(20),
    borderRadius: (SHUTTER - ms(20)) / 2,
    backgroundColor: colors.primary,
  },
  stopMark: {
    width: ms(26),
    height: ms(26),
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
});

export default VideoRecorder;
