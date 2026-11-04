import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Icon, IconButton, IconTile } from '../../components';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';
import { useSignedIn } from '../../store/userStore';
import { getMyProfileAnswers } from '../../api/services/insights.api';
import ProfileQuestions from './ProfileQuestions';

// "Not now" hides the card until the app is next opened.
let dismissedThisRun = false;

// Signed in: a small Home card with the optional questions (the web's HomeInsightsCard),
// only for someone who has neither answered nor skipped, so a new account sees it
// right after signing up. Skip records it and the card doesn't come back. Shows nothing
// while loading or when the lookup fails.
function HomeInsightsCard({ style }) {
  const t = useT();
  const signedIn = useSignedIn();
  const [state, setState] = useState('hidden'); // 'hidden' | 'ask' | 'open' | 'thanks'

  useEffect(() => {
    if (!signedIn || dismissedThisRun) {
      setState('hidden');
      return undefined;
    }
    let cancelled = false;
    getMyProfileAnswers()
      .then(answers => {
        if (!cancelled && answers === null) setState('ask');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (state === 'hidden') return null;

  const dismiss = () => {
    dismissedThisRun = true;
    setState('hidden');
  };

  const thanks = state === 'thanks';
  const body = { ask: 'insights.card.body', thanks: 'insights.card.thanks' }[state];

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.head}>
        {thanks ? (
          <IconTile name="check" color={colors.success} backgroundColor={colors.successLight} />
        ) : (
          <IconTile name="messageCircle" />
        )}
        <View style={styles.text}>
          <AppText variant="title">{t(thanks ? 'insights.card.thanksTitle' : 'insights.card.title')}</AppText>
          {body ? (
            <AppText variant="caption" color={colors.body}>
              {t(body)}
            </AppText>
          ) : null}
        </View>
        <IconButton onPress={dismiss} size={ms(32)} accessibilityLabel={t('insights.card.dismiss')}>
          <Icon name="close" size={ms(16)} color={colors.body} />
        </IconButton>
      </View>
      {state === 'ask' ? <Button title={t('insights.card.start')} size="md" fullWidth onPress={() => setState('open')} /> : null}
      {state === 'open' ? (
        <ProfileQuestions onFinished={outcome => setState(outcome === 'answered' ? 'thanks' : 'hidden')} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});

export default HomeInsightsCard;
