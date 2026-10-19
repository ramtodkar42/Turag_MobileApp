import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import IconButton from '../common/IconButton';
import Icon from '../icons/Icon';
import LevelBars from './LevelBars';
import PulseDot from './PulseDot';
import { colors, radius, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { formatTimer } from '../../utils/format';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import { useT } from '../../i18n';

const BUTTON = ms(38);

// WhatsApp-style voice note in a pill:
// idle -> mic button; recording -> red dot, timer, live bars, stop;
// recorded -> play/pause, bars with progress, length, delete.
function AudioRecorder({ maxMs = 30000, onRecorded, style }) {
  const t = useT();
  const rec = useAudioRecorder({ maxMs, onRecorded });
  const toSeconds = value => Math.floor(value / 1000);

  // Round button; red with a white icon unless `light` (grey with a dark icon).
  const button = (name, onPress, label, { filled = true, light = false } = {}) => (
    <IconButton
      onPress={onPress}
      size={BUTTON}
      backgroundColor={light ? colors.border : colors.primary}
      accessibilityLabel={label}
    >
      <Icon
        name={name}
        size={ms(16)}
        color={light ? colors.heading : colors.white}
        filled={filled}
        strokeWidth={2}
      />
    </IconButton>
  );

  let content;
  if (rec.status === 'recording') {
    content = (
      <>
        <PulseDot />
        <AppText variant="label" color={colors.heading} style={styles.time}>
          {formatTimer(toSeconds(rec.elapsedMs))}
        </AppText>
        <LevelBars levels={rec.levels} />
        {button('stop', rec.stop, t('common.audio.stop'))}
      </>
    );
  } else if (rec.status === 'recorded' || rec.status === 'playing') {
    const playing = rec.status === 'playing';
    const progress = rec.durationMs ? Math.min(1, rec.elapsedMs / rec.durationMs) : 0;
    content = (
      <>
        {button(playing ? 'pause' : 'play', playing ? rec.pause : rec.play, playing ? t('common.audio.pause') : t('common.audio.play'))}
        <LevelBars levels={rec.levels} progress={progress} />
        <AppText variant="label" color={colors.heading} style={styles.time}>
          {formatTimer(toSeconds(playing ? rec.elapsedMs : rec.durationMs))}
        </AppText>
        {button('trash', rec.discard, t('common.audio.delete'), { filled: false, light: true })}
      </>
    );
  } else {
    content = (
      <>
        {button('mic', rec.start, t('common.audio.start'), { filled: false })}
        <AppText variant="caption" style={styles.hint}>
          {rec.available
            ? t('common.audio.hint', { seconds: toSeconds(maxMs) })
            : t('common.audio.needsUpdate')}
        </AppText>
      </>
    );
  }

  return (
    <View style={style}>
      <View style={styles.pill}>{content}</View>
      {rec.error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {rec.error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: BUTTON + spacing.sm * 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.input,
  },
  time: {
    minWidth: ms(40),
    textAlign: 'center',
  },
  hint: {
    flex: 1,
    fontSize: fs(12),
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
});

export default AudioRecorder;
