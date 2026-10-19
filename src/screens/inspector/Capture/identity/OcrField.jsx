import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, TextField } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// One AI-read value (see ocrConfirm): "Detected X - is this correct?
// [Yes] [Edit]", then a ticked value once confirmed, or a text field to type it.
// fromPhoto: a photo was read (so an empty field means "couldn't read it").
function OcrField({ label, state, fromPhoto, disabled, onYes, onEdit, onChange }) {
  const t = useT();

  if (state.status === 'DETECTED' || state.status === 'CONFIRMED') {
    const confirmed = state.status === 'CONFIRMED';
    return (
      <View style={[styles.box, confirmed && styles.boxConfirmed]}>
        <AppText variant="caption">{label}</AppText>
        <View style={styles.valueRow}>
          <AppText variant="label" color={colors.heading} style={styles.value} selectable>
            {state.detected}
          </AppText>
          {confirmed ? (
            <View style={styles.tick}>
              <Icon name="check" size={ms(12)} color={colors.white} strokeWidth={3} />
            </View>
          ) : null}
        </View>
        {confirmed ? (
          <AppText variant="caption" color={colors.success}>
            {t('inspector.identity.confirmed')}
          </AppText>
        ) : (
          <>
            <AppText variant="caption">{t('inspector.identity.isCorrect')}</AppText>
            <View style={styles.buttons}>
              <Button title={t('common.yes')} size="sm" onPress={onYes} disabled={disabled} style={styles.button} />
              <Button
                title={t('inspector.identity.edit')}
                size="sm"
                variant="outline"
                onPress={onEdit}
                disabled={disabled}
                style={styles.button}
              />
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View>
      <TextField
        label={label}
        value={state.value}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {fromPhoto && state.detected == null ? (
        <AppText variant="caption" style={styles.hint}>
          {t('inspector.identity.notRead')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xxs,
  },
  boxConfirmed: {
    backgroundColor: colors.successLight,
    borderColor: colors.successLight,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    flexShrink: 1,
    fontFamily: fonts.subtitle.bold,
    fontSize: fs(16),
    lineHeight: fs(22),
    letterSpacing: 0.5,
  },
  tick: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
  },
  hint: {
    marginTop: spacing.xxs,
  },
});

export default OcrField;
