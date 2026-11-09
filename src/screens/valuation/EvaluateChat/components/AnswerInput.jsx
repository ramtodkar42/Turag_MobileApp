import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { formatNumber } from '../../../../utils/format';
import { isValidRegNumber, normalizeRegNumber, REG_NUMBER_MAX_LENGTH } from '../../../../utils/validators';
import { useT } from '../../../../i18n';
import ChatInput from '../../../chat/Chat/components/ChatInput';
import { MAX_KM } from '../steps';

const digits = text => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

// How each typed answer is read, shown, checked and sent.
const KINDS = {
  reg: {
    placeholderKey: 'valuation.evaluate.regPlaceholder',
    clean: text => normalizeRegNumber(text).slice(0, REG_NUMBER_MAX_LENGTH),
    show: value => value,
    valid: isValidRegNumber,
    value: text => text,
    inputProps: { autoCapitalize: 'characters', autoCorrect: false, maxLength: REG_NUMBER_MAX_LENGTH },
  },
  km: {
    placeholderKey: 'valuation.condition.kmPlaceholder',
    clean: (text, prev) => {
      const next = digits(text);
      return next === '' || Number(next) <= MAX_KM ? next : prev;
    },
    show: value => formatNumber(value),
    // 0 km is a real answer (a new car), as the web and the server allow.
    valid: value => value !== '',
    value: Number,
    inputProps: { keyboardType: 'number-pad' },
  },
};

// The chat's text box for a typed answer (registration number, km):
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
