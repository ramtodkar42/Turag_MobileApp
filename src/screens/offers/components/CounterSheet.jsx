import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, BottomSheet, Button, ButtonRow, TextField } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR, formatNumber } from '../../../utils/format';
import { useT } from '../../../i18n';

const MAX_DIGITS = 9; // up to ₹99,99,99,999

// ₹ amount sheet: "Counter" on an offer (buyer or seller), or a listing's new
// asking price. current: the amount now (rupees), shown for reference.
// fieldLabel / submitLabel: default to the counter wording.
// onSubmit(amount) runs it; errors from it show in the sheet.
function CounterSheet({ visible, title, current, fieldLabel, submitLabel, onSubmit, onClose }) {
  const t = useT();
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Fresh each time it opens.
  useEffect(() => {
    if (visible) {
      setDigits('');
      setError('');
      setSending(false);
    }
  }, [visible]);

  const amount = Number(digits);
  const valid = amount > 0 && amount !== current;

  const onSend = async () => {
    setSending(true);
    setError('');
    try {
      await onSubmit(amount);
    } catch (e) {
      setError(e.message || t('offers.error.action'));
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={sending ? undefined : onClose}>
      <AppText variant="h3" style={styles.title}>
        {title}
      </AppText>
      {current != null ? (
        <AppText variant="subtitle" style={styles.current}>
          {t('offers.counter.current', { amount: formatINR(current) })}
        </AppText>
      ) : null}
      <TextField
        label={fieldLabel ?? t('offers.counter.label')}
        placeholder={t('offers.counter.placeholder')}
        value={formatNumber(digits)}
        onChangeText={text => {
          setDigits(text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS));
          setError('');
        }}
        valid={valid}
        left={
          <AppText variant="body" color={colors.heading}>
            ₹
          </AppText>
        }
        keyboardType="number-pad"
        returnKeyType="done"
        autoFocus
        style={styles.field}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <ButtonRow style={styles.buttons}>
        <Button
          title={t('common.cancel')}
          variant="outline"
          onPress={onClose}
          disabled={sending}
          style={styles.flex}
        />
        <Button
          title={submitLabel ?? t('offers.counter.send')}
          onPress={onSend}
          disabled={!valid}
          loading={sending}
          style={styles.flex}
        />
      </ButtonRow>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  current: {
    marginTop: spacing.xs,
  },
  field: {
    marginTop: spacing.lg,
  },
  error: {
    marginTop: spacing.sm,
  },
  buttons: {
    marginTop: spacing.xl,
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default CounterSheet;
