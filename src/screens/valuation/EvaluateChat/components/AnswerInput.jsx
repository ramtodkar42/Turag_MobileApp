import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { formatNumber } from '../../../../utils/format';
import { isValidRegNumber, normalizeRegNumber } from '../../../../utils/validators';
import { useT } from '../../../../i18n';
import ChatInput from '../../../chat/Chat/components/ChatInput';
import { MAX_KM, MAX_OWNERS } from '../steps';

const MAX_REG_LENGTH = 10; // MH12CT4590
const digits = text => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

// How each typed answer is read, shown, checked and sent.
const KINDS = {
  reg: {
    placeholderKey: 'valuation.evaluate.regPlaceholder',
    clean: text => normalizeRegNumber(text).slice(0, MAX_REG_LENGTH),
    show: value => value,
    valid: isValidRegNumber,
    value: text => text,
    inputProps: { autoCapitalize: 'characters', autoCorrect: false, maxLength: MAX_REG_LENGTH },
  },
  km: {
    placeholderKey: 'valuation.condition.kmPlaceholder',
    clean: (text, prev) => {
      const next = digits(text);
      return next === '' || Number(next) <= MAX_KM ? next : prev;
    },
    show: value => formatNumber(value),
    valid: value => Number(value) > 0,
    value: Number,
    inputProps: { keyboardType: 'number-pad' },
  },
  owners: {
    placeholderKey: 'valuation.condition.ownersPlaceholder',
    clean: (text, prev) => {
      const next = digits(text);
      return next === '' || Number(next) <= MAX_OWNERS ? next : prev;
    },
    show: value => value,
    valid: value => Number(value) >= 1,
    value: Number,
    inputProps: { keyboardType: 'number-pad' },
  },
};

// The chat's text box for a typed answer (registration number, km, owners):
// Send shows once the answer is valid. onSubmit(value).
function AnswerInput({ kind, onSubmit }) {
  const t = useT();
  const spec = KINDS[kind];
  const [text, setText] = useState('');
  const valid = spec.valid(text);

  // Sent: the keyboard closes, so TURAG.AI's reply (often a card) and the
  // next choices are in view.
  const send = () => {
    if (valid) {
      Keyboard.dismiss();
      onSubmit(spec.value(text));
      setText('');
    }
  };

  return (
    <View>
      {kind === 'reg' && !valid && text.length >= 8 ? (
        <AppText variant="caption" color={colors.placeholder} style={styles.hint}>
          {t('valuation.evaluate.regHint')}
        </AppText>
      ) : null}
      <ChatInput
        value={spec.show(text)}
        onChangeText={value => setText(prev => spec.clean(value, prev))}
        placeholder={t(spec.placeholderKey)}
        inputProps={{ ...spec.inputProps, returnKeyType: 'send', onSubmitEditing: send, blurOnSubmit: false }}
        canSend={valid}
        onSend={send}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: spacing.xs,
    marginLeft: spacing.lg,
  },
});

export default AnswerInput;
