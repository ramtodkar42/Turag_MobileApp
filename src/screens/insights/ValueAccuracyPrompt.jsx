import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';
import { useSignedIn } from '../../store/userStore';
import { submitFeedback } from '../../api/services/insights.api';
import ChipChoices from './ChipChoices';

const CHOICES = ['TOO_LOW', 'ABOUT_RIGHT', 'TOO_HIGH'];

// "Was this value close to what you expected?" under a valuation (the web's
// ValueAccuracyPrompt), for signed-in users. One tap sends it, then a thank-you.
function ValueAccuracyPrompt({ valuationId, style }) {
  const t = useT();
  const signedIn = useSignedIn();
  const [state, setState] = useState('ask'); // 'ask' | 'sending' | 'done' | 'error'
  const [picked, setPicked] = useState(null);

  if (!signedIn || !valuationId) return null;

  const answer = async choice => {
    if (state === 'sending') return;
    setPicked(choice);
    setState('sending');
    try {
      await submitFeedback({ kind: 'VALUE_ACCURACY', subject_id: valuationId, choice });
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <AppText variant="subtitle" color={colors.heading} style={style}>
        {t('insights.thanks')}
      </AppText>
    );
  }
  return (
    <View style={[styles.wrap, style]}>
      <ChipChoices
        label={t('insights.value.q')}
        options={CHOICES.map(value => ({ value, label: t(`insights.value.${value}`) }))}
        isSelected={value => picked === value && state === 'sending'}
        onToggle={answer}
        chipStyle={styles.chip}
      />
      {state === 'error' ? (
        <AppText variant="caption" color={colors.danger}>
          {t('insights.sendError')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  chip: {
    minHeight: ms(36),
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xxs,
  },
});

export default ValueAccuracyPrompt;
