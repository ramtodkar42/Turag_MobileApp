import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, FadeIn, Icon } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { scrollToView } from '../../../../utils/scrollToView';
import { useT } from '../../../../i18n';
import OutcomeBanner from './OutcomeBanner';
import UploadProgress from './UploadProgress';
import VideoPreview from './VideoPreview';

// Shown until the upload reports its first step.
const PREPARING = { stage: 'preparing' };
// A new recording: once the screen is back from the camera, glide down to it.
const REVEAL_DELAY_MS = 350;
// The buttons and the upload panel take each other's place with a quick fade.
const SWAP_MS = 180;

// A required video (the web's GuidedVideoCapture: walkaround, engine start): what to
// film, record it, watch it, then use it or record it again. Only a clip the owner
// accepted is sent, so the inspection keeps exactly one video per item.
// guide: { tipKeys, checkCoverage }. pending: { uri, ... } the recording awaiting a
// decision. savedUri: the clip already sent on this visit (still on the phone).
// error: why the last recording was refused (e.g. too short).
// progress: where the upload is ({ stage, fraction }).
// message: the upload's outcome ({ kind, text }) - a failure says what to do and
// "Try again" sends the same recording again.
// nextLabel / onNext: once it's saved, the way on to the next group.
// scrollRef: the screen's ScrollView - a new recording (or why it was refused)
// scrolls into view, its buttons right under it. While it uploads, one panel takes
// the buttons' place.
// onUse(file) resolves true once it's stored; failures come back in `message`.
function GuidedVideo({
  guide,
  title,
  minS,
  maxS,
  have,
  busy,
  disabled,
  pending,
  savedUri,
  error,
  message,
  progress,
  nextLabel,
  onNext,
  scrollRef,
  onRecord,
  onUse,
}) {
  const t = useT();
  const [sending, setSending] = useState(false);
  const working = busy || sending;
  const failed = !working && message?.kind === 'error';
  const saved = !pending && (have || !!savedUri);
  const anchor = useRef(null);
  const revealed = useRef(null);
  // What came back from the camera: the new clip, or why it was refused.
  const reveal = pending?.uri ?? error ?? null;

  useEffect(() => {
    if (!reveal || revealed.current === reveal) return undefined;
    const timer = setTimeout(() => {
      revealed.current = reveal;
      scrollToView(scrollRef, anchor.current, spacing.md);
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [reveal, scrollRef]);

  const use = async () => {
    setSending(true);
    try {
      await onUse(pending);
    } finally {
      setSending(false);
    }
  };

  let media = null;
  if (pending) {
    media = (
      <FadeIn key={pending.uri} style={styles.wrap}>
        <VideoPreview uri={pending.uri} label={title} />
        {!failed ? <AppText variant="caption">{t('selfInspection.gvideo.preview')}</AppText> : null}
      </FadeIn>
    );
  } else if (saved) {
    media = (
      <FadeIn key="saved" style={styles.wrap}>
        <OutcomeBanner tone="success" title={t('selfInspection.gvideo.savedTitle')} text={t('selfInspection.gvideo.savedHint')} />
        {savedUri ? <VideoPreview uri={savedUri} label={title} /> : null}
      </FadeIn>
    );
  }

  const recordButton = (
    <Button
      title={t(pending || saved ? 'selfInspection.gvideo.retake' : 'selfInspection.gvideo.record')}
      variant={pending || saved ? 'outline' : 'primary'}
      size="md"
      fullWidth={false}
      disabled={disabled}
      leftIcon={<Icon name="camera" size={ms(15)} color={pending || saved ? colors.primary : colors.white} />}
      onPress={onRecord}
      style={styles.flex}
    />
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.tips}>
        {guide.tipKeys.map(key => (
          <AppText key={key} variant="caption">{`•  ${t(key)}`}</AppText>
        ))}
      </View>

      {/* The clip, then straight under it how it went and what to do next. */}
      <View ref={anchor} collapsable={false} style={styles.wrap}>
        {media}

        {failed ? <OutcomeBanner tone="danger" title={t('selfInspection.gvideo.failedTitle')} text={message.text} /> : null}

        {working ? (
          <FadeIn key="progress" offset={0} duration={SWAP_MS}>
            <UploadProgress progress={progress ?? PREPARING} />
          </FadeIn>
        ) : (
          <FadeIn key="buttons" offset={0} duration={SWAP_MS} style={styles.wrap}>
            <ButtonRow>
              {recordButton}
              {pending ? (
                <Button
                  title={t(failed ? 'common.retry' : 'selfInspection.gvideo.use')}
                  size="md"
                  fullWidth={false}
                  disabled={disabled}
                  onPress={use}
                  style={styles.flex}
                />
              ) : null}
            </ButtonRow>
            {saved && nextLabel && onNext ? <Button title={nextLabel} size="md" onPress={onNext} /> : null}
          </FadeIn>
        )}

        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : null}
        {message && !failed && !working ? (
          <AppText variant="caption" color={colors.body}>
            {message.text}
          </AppText>
        ) : null}
      </View>

      {/* The automatic area check isn't live yet (as the web): a reviewer checks the clip. */}
      {pending && guide.checkCoverage ? <AppText variant="caption">{t('selfInspection.gvideo.unverified')}</AppText> : null}
      {maxS ? (
        <AppText variant="caption">
          {minS
            ? t('selfInspection.gvideo.lenRange', { min: minS, max: maxS })
            : t('selfInspection.gvideo.maxLen', { max: maxS })}
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
  flex: {
    flex: 1,
  },
});

export default GuidedVideo;
