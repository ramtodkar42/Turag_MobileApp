import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, TextField } from '../../components';
import { colors, fonts, radius, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { useT } from '../../i18n';
import { getMyFeedback, submitFeedback } from '../../api/services/insights.api';

const SCORES = Array.from({ length: 11 }, (_, i) => i);
const COMMENT_MAX = 500;

// "How likely are you to recommend Turag to a friend?" (the web's NpsCard) on a
// completed order, for its buyer or seller. Shows nothing if they've answered, or if
// that can't be checked (rather than ask twice).
function NpsCard({ orderId, style }) {
  const t = useT();
  const [state, setState] = useState('checking'); // 'checking' | 'ask' | 'sending' | 'thanks' | 'hidden'
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyFeedback('NPS', orderId)
      .then(existing => {
        if (!cancelled) setState(existing ? 'hidden' : 'ask');
      })
      .catch(() => {
        if (!cancelled) setState('hidden');
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (state === 'checking' || state === 'hidden') return null;

  const send = async () => {
    if (score === null || state === 'sending') return;
    setState('sending');
    setError(false);
    try {
      const text = comment.trim();
      await submitFeedback({ kind: 'NPS', subject_id: orderId, score, comment: text === '' ? null : text.slice(0, COMMENT_MAX) });
      setState('thanks');
    } catch {
      setError(true);
      setState('ask');
    }
  };

  return (
    <Card style={[styles.card, style]}>
      {state === 'thanks' ? (
        <AppText variant="label" color={colors.heading}>
          {t('insights.nps.thanks')}
        </AppText>
      ) : (
        <>
          <AppText variant="title">{t('insights.nps.q')}</AppText>
          <View style={styles.scores}>
            {SCORES.map(n => (
              <Pressable
                key={n}
                onPress={() => setScore(n)}
                accessibilityRole="radio"
                accessibilityState={{ selected: score === n }}
                accessibilityLabel={t('insights.nps.scoreLabel', { n })}
                style={[styles.score, score === n && styles.scoreOn]}
              >
                <AppText style={[styles.scoreText, score === n && styles.scoreTextOn]}>{n}</AppText>
              </Pressable>
            ))}
          </View>
          <View style={styles.ends}>
            <AppText variant="caption" style={styles.flex}>
              {t('insights.nps.low')}
            </AppText>
            <AppText variant="caption" align="right" style={styles.flex}>
              {t('insights.nps.high')}
            </AppText>
          </View>
          {score !== null ? (
            <TextField
              label={t('insights.nps.improve')}
              value={comment}
              multiline
              maxLength={COMMENT_MAX}
              onChangeText={setComment}
            />
          ) : null}
          {error ? (
            <AppText variant="caption" color={colors.danger}>
              {t('insights.sendError')}
            </AppText>
          ) : null}
          <Button
            title={t('insights.nps.send')}
            size="md"
            loading={state === 'sending'}
            disabled={score === null}
            onPress={send}
          />
        </>
      )}
    </Card>
  );
}

const SCORE = ms(38);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  scores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  score: {
    width: SCORE,
    height: SCORE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  scoreOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  scoreText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(14),
    lineHeight: fs(19),
    color: colors.heading,
  },
  scoreTextOn: {
    color: colors.white,
  },
  ends: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});

export default NpsCard;
