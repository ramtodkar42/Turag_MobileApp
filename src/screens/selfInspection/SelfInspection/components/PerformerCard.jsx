import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, Icon, TextField } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { HIT_SLOP } from '../../../../constants/layout';
import { PERFORMER_NAME_MAX } from '../usePerformer';
import SectionCard from './SectionCard';

const SELFIE = ms(72);

// "Before you start: who is doing this inspection?" (ADR-0104, as the web): a
// selfie with the front camera and the person's name, saved before submit.
// Once saved it's one line, "Selfie added for {name}", with "Change".
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
        <AppText variant="label" color={colors.heading} style={styles.flex}>
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

  return (
    <SectionCard
      title={t('selfInspection.performer.title')}
      subtitle={t('selfInspection.performer.body')}
      style={[styles.form, style]}
    >
      {status === 'error' ? (
        <AppText variant="caption" color={colors.body}>
          {t('selfInspection.performer.loadErr')}
        </AppText>
      ) : null}

      <View style={styles.selfieRow}>
        <Pressable
          onPress={takeSelfie}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t(photo ? 'selfInspection.performer.retake' : 'selfInspection.performer.take')}
          style={({ pressed }) => [styles.selfie, pressed && styles.pressed]}
        >
          {photo ? (
            <Image
              source={{ uri: photo.uri }}
              style={styles.selfieImage}
              accessibilityLabel={t('selfInspection.performer.selfieLabel')}
            />
          ) : (
            <Icon name="camera" size={ms(24)} color={colors.primary} />
          )}
        </Pressable>
        <Button
          title={t(photo ? 'selfInspection.performer.retake' : 'selfInspection.performer.take')}
          variant="outline"
          size="md"
          fullWidth={false}
          onPress={takeSelfie}
          disabled={busy}
          style={styles.flex}
        />
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
        editable={!busy}
      />

      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}

      <ButtonRow>
        {editing ? (
          <Button
            title={t('common.cancel')}
            variant="outline"
            size="md"
            fullWidth={false}
            onPress={cancelChange}
            disabled={busy}
            style={styles.flex}
          />
        ) : null}
        <Button
          title={t('common.save')}
          size="md"
          fullWidth={false}
          onPress={save}
          loading={busy}
          disabled={busy}
          style={styles.flex}
        />
      </ButtonRow>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  // A red edge, as the web: it's needed before submit.
  form: {
    borderLeftWidth: ms(3),
    borderLeftColor: colors.primary,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  selfieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selfie: {
    width: SELFIE,
    height: SELFIE,
    borderRadius: SELFIE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.dangerLight,
  },
  selfieImage: {
    width: SELFIE,
    height: SELFIE,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default PerformerCard;
