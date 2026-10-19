import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, ChoiceChip, FadeIn, SelectField, TextField } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { NA_REASONS, SEVERITY_CHOICES } from '../constants';
import SaveStatus from './SaveStatus';

const COSTED = new Set(['MODERATE', 'MAJOR', 'CRITICAL']);

// One item's answer (the web's AnswerControls) in the app's style: the
// severity choices as ChoiceChips in two columns - or a number field with
// "I can't check this" for number items - plus what the server needs, shown
// only when relevant: why it can't be checked, the repair cost for moderate
// or worse, and a note (required for critical).
// state: { severity, note, cost, num, naReason, saving, saved, error }.
function AnswerControls({
  label,
  numeric,
  numericPlaceholder,
  state,
  disabled,
  onSeverity,
  onNaReason,
  onNumChange,
  onNumCommit,
  onCostChange,
  onNoteChange,
  onCommit,
}) {
  const t = useT();
  const sev = state.severity;
  const na = sev === 'NOT_ASSESSABLE';

  return (
    <View style={styles.wrap}>
      {numeric ? (
        <View style={styles.numeric}>
          {!na ? (
            <TextField
              label={label}
              value={state.num}
              editable={!disabled}
              onChangeText={onNumChange}
              onBlur={onNumCommit}
              onSubmitEditing={onNumCommit}
              placeholder={numericPlaceholder ?? t('selfInspection.answer.number')}
              keyboardType="number-pad"
              returnKeyType="done"
              inputStyle={styles.numberInput}
            />
          ) : null}
          <Pressable onPress={() => onSeverity(na ? 'OK' : 'NOT_ASSESSABLE')} disabled={disabled} accessibilityRole="button" hitSlop={8}>
            <AppText variant="caption" style={styles.link}>
              {t(na ? 'selfInspection.answer.canEnter' : 'selfInspection.answer.cantCheck')}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {SEVERITY_CHOICES.map(choice => (
            <ChoiceChip
              key={choice.value}
              label={t(choice.labelKey)}
              selected={sev === choice.value}
              onPress={disabled ? undefined : () => onSeverity(choice.value)}
              style={styles.choice}
            />
          ))}
        </View>
      )}

      {na ? (
        <FadeIn>
          <SelectField
            label={t('selfInspection.answer.whyCant')}
            value={state.naReason || undefined}
            options={NA_REASONS.map(reason => ({ value: reason, label: t(`selfInspection.na.${reason}`) }))}
            onChange={onNaReason}
            placeholder={t('selfInspection.answer.chooseReason')}
          />
        </FadeIn>
      ) : null}

      {COSTED.has(sev) ? (
        <FadeIn>
          <TextField
            label={t('selfInspection.answer.cost')}
            value={state.cost}
            editable={!disabled}
            onChangeText={text => onCostChange(text.replace(/[^\d]/g, ''))}
            onBlur={onCommit}
            placeholder={t('selfInspection.answer.costPlaceholder')}
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </FadeIn>
      ) : null}

      {sev && !na && !numeric ? (
        <FadeIn>
          <TextField
            label={t(sev === 'CRITICAL' ? 'selfInspection.answer.noteRequired' : 'selfInspection.answer.noteOptional')}
            value={state.note}
            editable={!disabled}
            onChangeText={onNoteChange}
            onBlur={onCommit}
            placeholder={t(sev === 'OK' ? 'selfInspection.answer.notePlaceholderOk' : 'selfInspection.answer.notePlaceholder')}
          />
        </FadeIn>
      ) : null}

      <SaveStatus state={state} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  numeric: {
    gap: spacing.sm,
  },
  numberInput: {
    fontFamily: fonts.title.bold,
    fontSize: fs(18),
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choice: {
    flexBasis: '46%',
    flexGrow: 1,
  },
});

export default AnswerControls;
