import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, FadeIn, Icon } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import VideoPreview from './VideoPreview';

// A required video (the web's GuidedVideoCapture: walkaround, engine start): what to
// film, record it, watch it, then use it or record it again. Only a clip the owner
// accepted is sent, so the inspection keeps exactly one video per item.
// guide: { tipKeys, checkCoverage }. pending: { uri, ... } the recording awaiting a
// decision. savedUri: the clip already sent on this visit (still on the phone).
// error: why the last recording was refused (e.g. too short).
// onUse(file) resolves true once it's stored; failures come back in `message`.
function GuidedVideo({ guide, title, minS, maxS, have, busy, disabled, pending, savedUri, error, message, onRecord, onUse }) {
  const t = useT();
  const [sending, setSending] = useState(false);
  const working = busy || sending;

  const use = async () => {
    setSending(true);
    try {
      await onUse(pending);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tips}>
        {guide.tipKeys.map(key => (
          <AppText key={key} variant="caption">{`•  ${t(key)}`}</AppText>
        ))}
      </View>

      {pending ? (
        <FadeIn style={styles.wrap}>
          <VideoPreview uri={pending.uri} label={title} />
          {/* The automatic area check isn't live yet (as the web): a reviewer checks the clip. */}
          {guide.checkCoverage ? <AppText variant="caption">{t('selfInspection.gvideo.unverified')}</AppText> : null}
          <AppText variant="caption">{t('selfInspection.gvideo.preview')}</AppText>
        </FadeIn>
      ) : savedUri ? (
        <View style={styles.wrap}>
          <AppText variant="caption">{t('selfInspection.gvideo.uploaded')}</AppText>
          <VideoPreview uri={savedUri} label={title} />
        </View>
      ) : have ? (
        <View style={styles.added}>
          <Icon name="check" size={ms(16)} color={colors.success} strokeWidth={2.6} />
          <AppText variant="label" color={colors.heading} style={styles.flex}>
            {t('selfInspection.gvideo.added')}
          </AppText>
        </View>
      ) : null}

      <ButtonRow>
        <Button
          title={t(pending || have ? 'selfInspection.gvideo.retake' : 'selfInspection.gvideo.record')}
          variant={pending ? 'outline' : 'primary'}
          size="md"
          fullWidth={false}
          disabled={disabled || working}
          leftIcon={<Icon name="camera" size={ms(15)} color={pending ? colors.primary : colors.white} />}
          onPress={onRecord}
          style={styles.flex}
        />
        {pending ? (
          <Button
            title={t(working ? 'selfInspection.uploading' : 'selfInspection.gvideo.use')}
            size="md"
            fullWidth={false}
            loading={working}
            disabled={disabled}
            onPress={use}
            style={styles.flex}
          />
        ) : null}
      </ButtonRow>

      {maxS ? (
        <AppText variant="caption">
          {minS
            ? t('selfInspection.gvideo.lenRange', { min: minS, max: maxS })
            : t('selfInspection.gvideo.maxLen', { max: maxS })}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
      {message ? (
        <AppText variant="caption" color={message.kind === 'error' ? colors.danger : colors.body}>
          {message.text}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  tips: {
    gap: spacing.xs,
  },
  added: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: spacing.sm,
    backgroundColor: colors.successLight,
  },
  flex: {
    flex: 1,
  },
});

export default GuidedVideo;
