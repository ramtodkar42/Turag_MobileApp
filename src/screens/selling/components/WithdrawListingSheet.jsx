import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText, BottomSheet, Button, ButtonRow, TextField } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { WITHDRAWAL_NOTE_MAX, WITHDRAWAL_REASONS } from '../../../constants/listingWithdrawal';

const RADIO = ms(20);

// One reason: a round radio and its label (the whole row is tappable).
function ReasonRow({ label, selected, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [styles.reason, selected && styles.reasonSelected, pressed && styles.pressed]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <AppText variant="subtitle" color={colors.heading} style={styles.reasonText}>
        {label}
      </AppText>
    </Pressable>
  );
}

// "Withdraw this listing?" (ADR-0105, as the web's WithdrawListingDialog):
// withdrawing is final, so this is also the confirmation. It says what happens
// (open offers are closed and those buyers told), asks why - a reason is
// required, and "Other" needs a note - then Keep listing / Withdraw listing.
// busy: withdrawing now; error: the server's answer (shown in the sheet);
// onConfirm(reason, note | null); onClose.
function WithdrawListingSheet({ visible, busy = false, error, onConfirm, onClose }) {
  const t = useT();
  const { height } = useWindowDimensions();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [localError, setLocalError] = useState('');

  // Fresh each time it opens.
  useEffect(() => {
    if (visible) {
      setReason(null);
      setNote('');
      setLocalError('');
    }
  }, [visible]);

  const choose = code => {
    setReason(code);
    setLocalError('');
  };

  const confirm = () => {
    if (busy) return;
    if (!reason) {
      setLocalError(t('selling.withdraw.needReason'));
      return;
    }
    const trimmed = note.trim();
    if (reason === 'OTHER' && !trimmed) {
      setLocalError(t('selling.withdraw.needNote'));
      return;
    }
    onConfirm(reason, trimmed || null);
  };

  const shownError = localError || error;

  return (
    <BottomSheet visible={visible} onClose={busy ? undefined : onClose}>
      <ScrollView
        style={{ maxHeight: height * 0.62 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="h3" style={styles.title}>
          {t('selling.withdraw.title')}
        </AppText>
        <AppText variant="caption" color={colors.body} style={styles.body}>
          {t('selling.withdraw.body')}
        </AppText>

        <AppText variant="label" color={colors.heading} style={styles.question}>
          {t('selling.withdraw.question')}
          <AppText variant="label" color={colors.primary}>
            {' *'}
          </AppText>
        </AppText>
        <View accessibilityRole="radiogroup" style={styles.reasons}>
          {WITHDRAWAL_REASONS.map(code => (
            <ReasonRow
              key={code}
              label={t(`selling.withdraw.reason.${code}`)}
              selected={reason === code}
              disabled={busy}
              onPress={() => choose(code)}
            />
          ))}
        </View>

        <TextField
          label={t(reason === 'OTHER' ? 'selling.withdraw.noteRequired' : 'selling.withdraw.noteOptional')}
          value={note}
          onChangeText={text => {
            setNote(text);
            if (localError) setLocalError('');
          }}
          multiline
          maxLength={WITHDRAWAL_NOTE_MAX}
          editable={!busy}
          style={styles.note}
        />

        {shownError ? (
          <AppText variant="caption" color={colors.danger} style={styles.error} accessibilityLiveRegion="polite">
            {shownError}
          </AppText>
        ) : null}
      </ScrollView>

      <ButtonRow style={styles.buttons}>
        <Button
          title={t('selling.withdraw.cancel')}
          variant="outline"
          size="md"
          fullWidth={false}
          onPress={onClose}
          disabled={busy}
          style={styles.flex}
        />
        <Button
          title={t('selling.withdraw.confirm')}
          size="md"
          fullWidth={false}
          onPress={confirm}
          loading={busy}
          style={styles.flex}
        />
      </ButtonRow>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  body: {
    marginTop: spacing.sm,
  },
  question: {
    marginTop: spacing.lg,
  },
  reasons: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ms(44),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: ms(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reasonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  pressed: {
    opacity: 0.85,
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: RADIO / 2,
    height: RADIO / 2,
    borderRadius: RADIO / 4,
    backgroundColor: colors.primary,
  },
  reasonText: {
    flex: 1,
  },
  note: {
    marginTop: spacing.lg,
  },
  error: {
    marginTop: spacing.sm,
  },
  buttons: {
    marginTop: spacing.lg,
  },
  flex: {
    flex: 1,
  },
});

export default WithdrawListingSheet;
