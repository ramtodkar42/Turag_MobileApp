import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText, BottomSheet, Button, Icon, IconButton, IconTile, NoticeRow } from '../../components';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';
import { useSignedIn } from '../../store/userStore';
import { getMyProfileAnswers } from '../../api/services/insights.api';
import ProfileQuestions from './ProfileQuestions';

// "Not now" hides the row until the app is next opened.
let dismissedThisRun = false;

// Signed in: the optional questions (the web's HomeInsightsCard), only for someone who
// has neither answered nor skipped (e.g. left sign-up's "Tell us about you" without
// either). On Home it's one small row like the others there; "Answer" opens the
// questions in a sheet over Home, so the page itself stays short. Answering shows a
// thank-you in the sheet; Skip records it. Either way the row goes for good. Closing
// the sheet midway keeps the row. Shows nothing while loading or when the lookup fails.
function HomeInsightsCard({ style }) {
  const t = useT();
  const signedIn = useSignedIn();
  const { height } = useWindowDimensions();
  const [asking, setAsking] = useState(false);
  const [sheet, setSheet] = useState(null); // null | 'questions' | 'thanks'

  useEffect(() => {
    if (!signedIn || dismissedThisRun) {
      setAsking(false);
      return undefined;
    }
    let cancelled = false;
    getMyProfileAnswers()
      .then(answers => {
        if (!cancelled && answers === null) setAsking(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!asking) return null;

  const dismiss = () => {
    dismissedThisRun = true;
    setAsking(false);
  };
  const done = () => {
    setSheet(null);
    setAsking(false);
  };
  const finished = outcome => (outcome === 'answered' ? setSheet('thanks') : done());
  const closeSheet = () => (sheet === 'thanks' ? done() : setSheet(null));
  const thanks = sheet === 'thanks';

  return (
    <>
      <NoticeRow
        icon="messageCircle"
        tone="plain"
        message={t('insights.card.title')}
        detail={t('insights.card.short')}
        actionLabel={t('insights.card.answer')}
        onPress={() => setSheet('questions')}
        onClose={dismiss}
        closeLabel={t('insights.card.dismiss')}
        accessibilityHint={t('insights.card.hint')}
        style={style}
      />
      <BottomSheet visible={sheet !== null} onClose={closeSheet}>
        <View style={styles.head}>
          <AppText variant="h3" style={styles.flex}>
            {t(thanks ? 'insights.card.thanksTitle' : 'insights.card.title')}
          </AppText>
          <IconButton onPress={closeSheet} size={ms(32)} accessibilityLabel={t('common.close')}>
            <Icon name="close" size={ms(16)} color={colors.body} />
          </IconButton>
        </View>
        {thanks ? (
          <View style={styles.body}>
            <View style={styles.thanks}>
              <IconTile name="check" color={colors.success} backgroundColor={colors.successLight} />
              <AppText variant="body" color={colors.body} style={styles.flex}>
                {t('insights.card.thanks')}
              </AppText>
            </View>
            <Button title={t('common.done')} size="md" fullWidth onPress={done} />
          </View>
        ) : (
          // Scrolls on a small phone (ten choices on the first question).
          <ScrollView
            style={{ maxHeight: height * 0.72 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="caption" color={colors.body}>
              {t('insights.card.body')}
            </AppText>
            <ProfileQuestions onFinished={finished} />
          </ScrollView>
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  body: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  thanks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});

export default HomeInsightsCard;
