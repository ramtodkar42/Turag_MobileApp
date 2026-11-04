import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextField } from '../../components';
import { spacing } from '../../theme';
import { useT } from '../../i18n';
import { submitFeedback } from '../../api/services/insights.api';
import ChipChoices from './ChipChoices';

const REASONS = ['PRICE', 'TIMING', 'SOLD_OR_BOUGHT_ELSEWHERE', 'CHANGED_MIND', 'BAD_EXPERIENCE', 'OTHER'];
const COMMENT_MAX = 500;

// The optional "why are you cancelling?" shown before a booking cancel is confirmed
// (the web's CancelReasonPicker). onChange({ choice, comment }).
function CancelReasonPicker({ onChange, style }) {
  const t = useT();
  const [choice, setChoice] = useState(null);
  const [comment, setComment] = useState('');
  return (
    <View style={[styles.wrap, style]}>
      <ChipChoices
        label={t('insights.cancel.q')}
        options={REASONS.map(value => ({ value, label: t(`insights.cancel.${value}`) }))}
        isSelected={value => choice === value}
        onToggle={value => {
          const next = choice === value ? null : value;
          setChoice(next);
          onChange({ choice: next, comment });
        }}
      />
      <TextField
        label={t('insights.cancel.comment')}
        value={comment}
        multiline
        maxLength={COMMENT_MAX}
        onChangeText={text => {
          setComment(text);
          onChange({ choice, comment: text });
        }}
      />
    </View>
  );
}

// Sent after the booking was cancelled, fire and forget: the reason is optional, so a
// failed send never changes the cancel the user already confirmed.
export const sendCancelReason = (bookingId, reason) => {
  const comment = (reason?.comment ?? '').trim().slice(0, COMMENT_MAX);
  const choice = reason?.choice ?? null;
  if (choice === null && comment === '') return;
  submitFeedback({
    kind: 'BOOKING_CANCEL_REASON',
    subject_id: bookingId,
    choice,
    comment: comment === '' ? null : comment,
  }).catch(() => {});
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});

export default CancelReasonPicker;
