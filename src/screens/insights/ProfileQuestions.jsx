import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, TextField } from '../../components';
import { colors, spacing } from '../../theme';
import { useT } from '../../i18n';
import { saveProfileAnswers } from '../../api/services/insights.api';
import ChipChoices from './ChipChoices';
import QuestionProgress from './QuestionProgress';

const HEARD = ['GOOGLE', 'INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'FRIEND_FAMILY', 'DEALER', 'CAR_PORTAL', 'WHATSAPP', 'NEWS_PRINT', 'OTHER'];
const INTENTS = ['BUY', 'SELL', 'VALUE', 'INSPECTION', 'EXPLORE'];
const TIMELINES = ['THIS_WEEK', 'THIS_MONTH', 'ONE_TO_THREE_MONTHS', 'RESEARCHING'];
const HEARD_OTHER_MAX = 80;
const QUESTIONS = 3;

// The optional "tell us about you" questions (the web's ProfileQuestions), one at a
// time so the Home card stays short: where they heard of Turag, what brings them (any
// number), and when, only if buying or selling. Each is optional; saving needs one answer.
// onFinished('answered' | 'skipped' | 'failed'). A failure stays here with the reason,
// or with continueOnError (signing up: never hold the user up) just moves on; the Home
// card then asks again.
function ProfileQuestions({ onFinished, continueOnError = false, style }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [heardFrom, setHeardFrom] = useState(null);
  const [other, setOther] = useState('');
  const [intents, setIntents] = useState([]);
  const [timeline, setTimeline] = useState(null);
  const [busy, setBusy] = useState(null); // 'save' | 'skip'
  const [failed, setFailed] = useState(false);

  const asksTimeline = intents.includes('BUY') || intents.includes('SELL');
  const hasAnswer = heardFrom !== null || intents.length > 0;
  const isLast = step === QUESTIONS - 1 || (step === 1 && !asksTimeline);

  const toggleIntent = value => {
    const next = intents.includes(value) ? intents.filter(x => x !== value) : [...intents, value];
    setIntents(next);
    if (!next.includes('BUY') && !next.includes('SELL')) setTimeline(null);
  };

  const goTo = next => {
    if (busy) return;
    setFailed(false);
    setStep(next);
  };

  const send = async kind => {
    if (busy) return;
    setBusy(kind);
    setFailed(false);
    try {
      if (kind === 'skip') {
        await saveProfileAnswers({ skip: true });
        onFinished('skipped');
      } else {
        const otherText = heardFrom === 'OTHER' ? other.trim().slice(0, HEARD_OTHER_MAX) : '';
        await saveProfileAnswers({
          heard_from: heardFrom,
          heard_from_other: otherText === '' ? null : otherText,
          intents,
          timeline: asksTimeline ? timeline : null,
        });
        onFinished('answered');
      }
    } catch {
      if (continueOnError) onFinished('failed');
      else setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const options = (values, prefix) => values.map(value => ({ value, label: t(`insights.${prefix}.${value}`) }));

  return (
    <View style={[styles.wrap, style]}>
      <QuestionProgress current={step + 1} total={QUESTIONS} onBack={step > 0 ? () => goTo(step - 1) : null} />
      {step === 0 ? (
        <>
          <ChipChoices
            label={t('insights.q.heardFrom')}
            labelVariant="title"
            options={options(HEARD, 'heard')}
            isSelected={value => heardFrom === value}
            onToggle={value => setHeardFrom(heardFrom === value ? null : value)}
          />
          {heardFrom === 'OTHER' ? (
            <TextField
              label={t('insights.heard.otherLabel')}
              placeholder={t('insights.heard.otherPlaceholder')}
              value={other}
              maxLength={HEARD_OTHER_MAX}
              onChangeText={setOther}
            />
          ) : null}
        </>
      ) : null}
      {step === 1 ? (
        <ChipChoices
          label={t('insights.q.intents')}
          labelVariant="title"
          hint={t('insights.q.intentsHint')}
          options={options(INTENTS, 'intent')}
          isSelected={value => intents.includes(value)}
          onToggle={toggleIntent}
        />
      ) : null}
      {step === 2 ? (
        <ChipChoices
          label={t('insights.q.timeline')}
          labelVariant="title"
          options={options(TIMELINES, 'timeline')}
          isSelected={value => timeline === value}
          onToggle={value => setTimeline(timeline === value ? null : value)}
        />
      ) : null}
      {failed ? (
        <AppText variant="caption" color={colors.danger}>
          {t('insights.saveError')}
        </AppText>
      ) : null}
      <View style={styles.footer}>
        {isLast ? (
          <Button
            title={t('insights.save')}
            size="md"
            fullWidth
            loading={busy === 'save'}
            disabled={!hasAnswer || busy !== null}
            onPress={() => send('save')}
          />
        ) : (
          <Button title={t('common.next')} size="md" fullWidth disabled={busy !== null} onPress={() => goTo(step + 1)} />
        )}
        <Button
          title={t('insights.skip')}
          variant="ghost"
          size="sm"
          loading={busy === 'skip'}
          disabled={busy !== null}
          onPress={() => send('skip')}
          style={styles.skip}
        />
        <AppText variant="caption" color={colors.muted} align="center">
          {t('insights.privacyNote')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  footer: {
    gap: spacing.xs,
  },
  skip: {
    alignSelf: 'center',
  },
});

export default ProfileQuestions;
