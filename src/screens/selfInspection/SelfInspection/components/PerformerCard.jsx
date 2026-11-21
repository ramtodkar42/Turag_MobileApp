import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, Icon, TextField } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { HIT_SLOP } from '../../../../constants/layout';
import { PERFORMER_NAME_MAX } from '../usePerformer';

const SELFIE = ms(60);
const BADGE = ms(22);

// "Before you start: who is doing this inspection?" (ADR-0104, as the web), kept
// compact: a short heading and line, then the selfie (front camera; tap the
// circle) beside the name, and Save. Once saved it's one line, "Selfie added for
// {name}", with "Change". Hidden until it's known whether one was added (it's read
// with the inspection, so it's there when the page opens).
// performer: usePerformer().
function PerformerCard({ performer, style }) {
  const t = useT();
  const { status, saved, formOpen, editing, photo, name, setName, takeSelfie, startChange, cancelChange, save, busy, error } =
    performer;

  if (status === 'off' || status === 'loading' || status === 'unsupported') {
    return null;
  }

  if (!formOpen) {
    return (
      <View style={[styles.card, styles.doneRow, style]}>
        <Icon name="check" size={ms(18)} color={colors.success} strokeWidth={2.4} />
        <AppText variant="label" color={colors.heading} numberOfLines={1} style={styles.flex}>
          {t('selfInspection.performer.done', { name: saved.name })}
        </AppText>
        <Pressable
          onPress={startChange}
          accessibilityRole="button"
          accessibilityLabel={t('selfInspection.performer.changeLabel')}
          hitSlop={HIT_SLOP}
        >
          <AppText variant="label" color={colors.primary}>
            {t('selfInspection.performer.change')}
          </AppText>
        </Pressable>
      </View>
    );
  }

  const selfieLabel = t(photo ? 'selfInspection.performer.retake' : 'selfInspection.performer.take');

  return (
    <View style={[styles.card, style]}>
      <AppText style={styles.kicker}>{t('selfInspection.performer.kicker')}</AppText>
      <AppText style={styles.heading}>{t('selfInspection.performer.heading')}</AppText>
      <AppText variant="caption" style={styles.short}>
        {t('selfInspection.performer.short')}
      </AppText>
      {status === 'error' ? (
        <AppText variant="caption" color={colors.body} style={styles.short}>
          {t('selfInspection.performer.loadErr')}
        </AppText>
      ) : null}

      <View style={styles.row}>
        <View style={styles.selfieCol}>
          <Pressable
            onPress={takeSelfie}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={selfieLabel}
            style={({ pressed }) => [styles.selfie, photo && styles.selfieTaken, pressed && styles.pressed]}
          >
            {photo ? (
              <Image
                source={{ uri: photo.uri }}
                style={styles.selfieImage}
                accessibilityLabel={t('selfInspection.performer.selfieLabel')}
              />
            ) : (
              <Icon name="user" size={ms(26)} color={colors.placeholder} />
            )}
            <View style={styles.badge}>
              <Icon name="camera" size={ms(12)} color={colors.white} />
            </View>
          </Pressable>
          <AppText style={styles.selfieText} numberOfLines={2}>
            {selfieLabel}
          </AppText>
        </View>
        <TextField
          label={t('selfInspection.performer.nameLabel')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          maxLength={PERFORMER_NAME_MAX}
          returnKeyType="done"
          onSubmitEditing={save}
          editable={!busy}
          style={styles.flex}
        />
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}

      <ButtonRow style={styles.actions}>
        {editing ? (
          <Button
            title={t('common.cancel')}
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={cancelChange}
            disabled={busy}
          />
        ) : null}
        <Button title={t('common.save')} size="sm" fullWidth={false} onPress={save} loading={busy} disabled={busy} />
      </ButtonRow>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  kicker: {
    fontFamily: fonts.subtitle.bold,
    fontSize: fs(11.5),
    lineHeight: fs(15),
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heading: {
    marginTop: -spacing.xs,
    fontFamily: fonts.title.bold,
    fontSize: fs(16),
    lineHeight: fs(21),
    color: colors.heading,
  },
  short: {
    marginTop: -spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  selfieCol: {
    alignItems: 'center',
    width: SELFIE + spacing.md,
  },
  selfie: {
    width: SELFIE,
    height: SELFIE,
    borderRadius: SELFIE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  selfieTaken: {
    borderStyle: 'solid',
    borderColor: colors.success,
  },
  selfieImage: {
    width: SELFIE - 2,
    height: SELFIE - 2,
    borderRadius: (SELFIE - 2) / 2,
  },
  badge: {
    position: 'absolute',
    right: -ms(2),
    bottom: -ms(2),
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  selfieText: {
    marginTop: spacing.xs,
    fontSize: fs(11),
    lineHeight: fs(14),
    color: colors.body,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  actions: {
    justifyContent: 'flex-end',
  },
});

export default PerformerCard;
