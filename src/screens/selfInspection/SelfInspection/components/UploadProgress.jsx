import { StyleSheet, View } from 'react-native';
import { AppText, Spinner } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Where a video upload is, so the wait is never a mystery: preparing the file, then
// uploading with a bar and the percent, saving once every byte has gone (the store
// answers when it has the whole file), then the server's check - and a reminder to
// keep the app open (closing it stops the upload). The one loader while it goes up.
// progress: { stage: 'preparing' | 'uploading' | 'finishing', fraction? (0..1) }.
function UploadProgress({ progress, style }) {
  const t = useT();
  const { stage, fraction } = progress;
  const percent = stage === 'uploading' && fraction != null ? Math.min(100, Math.round(fraction * 100)) : null;
  const label = t(percent === 100 ? 'selfInspection.upload.saving' : `selfInspection.upload.${stage}`);
  return (
    <View
      style={[styles.box, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={percent != null ? { min: 0, max: 100, now: percent } : undefined}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Spinner size={ms(18)} />
        <AppText variant="label" color={colors.heading} style={styles.flex}>
          {label}
        </AppText>
        {percent != null && percent < 100 ? (
          <AppText variant="label" color={colors.primary}>
            {`${percent}%`}
          </AppText>
        ) : null}
      </View>
      {stage === 'uploading' ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent ?? 0}%` }]} />
        </View>
      ) : null}
      <AppText variant="caption">{t('selfInspection.upload.keepOpen')}</AppText>
    </View>
  );
}

const BAR = ms(6);

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  track: {
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: colors.primary,
  },
});

export default UploadProgress;
