import { StyleSheet, View } from 'react-native';
import { AppText, Button, ChoiceChip, DatePickerField, TextField } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import { toIsoDate } from '../../../../utils/date';
import { blankAnswer } from '../useSelfInspection';
import { itemName } from '../labels';

// Answered as a small count, with quick picks (number of keys).
const COUNT_ITEMS = new Set(['KEYS_M1']);
const COUNT_PICKS = ['1', '2', '3'];
// A past event (the last service): any date up to today.
const EARLIEST_DATE = '2000-01-01';

// Whether an item records a fact the owner knows (flood history, keys, servicing,
// the original RC) rather than a condition grade.
export const isFactItem = item =>
  item.answer_type === 'BOOL' ||
  item.answer_type === 'CHOICE' ||
  item.answer_type === 'DATE' ||
  COUNT_ITEMS.has(item.item_code);

// A fact's answer (the web's FactAnswer): Yes / No, one of the choices, a date, or
// the key count. There's no severity scale and no "can't check"; the server checks
// every value against the checklist. Yes / No saves as OK / MAJOR; a choice or a
// date carries its value with OK. An answer that needs details (flood: Yes) is held
// until they're typed and saved with it.
function FactAnswer({ si, item }) {
  const t = useT();
  const code = item.item_code;
  const state = si.local[code] ?? blankAnswer();
  const disabled = si.submitting;
  const label = itemName(t, item);
  const choiceLabel = (value, fallback) => {
    const key = `selfInspection.fact.choice.${value}`;
    const text = t(key);
    return text === key ? fallback : text;
  };

  const error = state.error ? (
    <AppText variant="caption" color={colors.danger}>
      {state.error}
    </AppText>
  ) : null;

  if (item.answer_type === 'BOOL') {
    return (
      <View style={styles.wrap}>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
          <Chip label={t('selfInspection.fact.yes')} selected={state.severity === 'OK'} disabled={disabled} onPress={() => si.record(code, { severity: 'OK' })} />
          <Chip label={t('selfInspection.fact.no')} selected={state.severity === 'MAJOR'} disabled={disabled} onPress={() => si.record(code, { severity: 'MAJOR' })} />
        </View>
        {error}
      </View>
    );
  }

  if (item.answer_type === 'CHOICE') {
    const needsDetails = (item.note_required_for ?? []).includes(state.value ?? '');
    return (
      <View style={styles.wrap}>
        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {(item.choices ?? []).map(choice => (
            <Chip
              key={choice.value}
              label={choiceLabel(choice.value, choice.label)}
              selected={state.value === choice.value}
              disabled={disabled}
              onPress={() => {
                if ((item.note_required_for ?? []).includes(choice.value)) {
                  si.updateLocal(code, c => ({ ...c, value: choice.value, severity: 'OK', saved: false }));
                } else {
                  // Any other answer saves at once and drops details of the previous one.
                  si.record(code, { value: choice.value, severity: 'OK', note: '' });
                }
              }}
            />
          ))}
        </View>
        {needsDetails ? (
          <View style={styles.wrap}>
            <TextField
              label={t('selfInspection.fact.detailsLabel')}
              placeholder={t('selfInspection.fact.detailsPlaceholder')}
              value={state.note}
              multiline
              editable={!disabled}
              onChangeText={note => si.updateLocal(code, c => ({ ...c, note, saved: false }))}
            />
            <Button
              title={t(state.saved ? 'selfInspection.fact.saved' : 'selfInspection.fact.save')}
              size="md"
              variant="outline"
              fullWidth={false}
              loading={state.saving === true}
              disabled={disabled || !state.note.trim()}
              onPress={() => si.record(code, { value: state.value, severity: 'OK', note: state.note })}
              style={styles.left}
            />
          </View>
        ) : null}
        {error}
      </View>
    );
  }

  if (item.answer_type === 'DATE') {
    return (
      <View style={styles.wrap}>
        <DatePickerField
          label={label}
          value={state.value || null}
          minDate={EARLIEST_DATE}
          maxDate={toIsoDate(new Date())}
          onChange={value => si.record(code, { value, severity: 'OK' })}
        />
        {error}
      </View>
    );
  }

  // The number of keys: quick picks, or any other number.
  return (
    <View style={styles.wrap}>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {COUNT_PICKS.map(n => (
          <Chip
            key={n}
            label={n}
            selected={state.saved === true && state.num === n}
            disabled={disabled}
            onPress={() => si.record(code, { num: n, severity: 'OK' })}
          />
        ))}
      </View>
      <TextField
        label={t('selfInspection.fact.otherNumber')}
        keyboardType="number-pad"
        value={COUNT_PICKS.includes(state.num) ? '' : state.num}
        editable={!disabled}
        onChangeText={num => si.typeAnswer(code, { num })}
      />
      {error}
    </View>
  );
}

// A choice that can't be changed while the inspection is being sent.
function Chip({ label, selected, disabled, onPress }) {
  return <ChoiceChip label={label} selected={selected} onPress={disabled ? undefined : onPress} style={styles.chip} />;
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
  },
  left: {
    alignSelf: 'flex-start',
  },
});

export default FactAnswer;
