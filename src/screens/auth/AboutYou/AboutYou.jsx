import { StyleSheet, View } from 'react-native';
import { AppText, Card, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import { useT } from '../../../i18n';
import { resetAfterSignIn } from '../../../navigation/authRoutes';
import ProfileQuestions from '../../insights/ProfileQuestions';

// The last, optional step of signing up (the web's sign-up "about" step): three quick
// questions. Never a gate: a save, Skip or a failed save all continue the same way.
// params: { then: [route, params] } where signing up goes next.
function AboutYou({ navigation, route }) {
  const t = useT();
  const { then } = route.params;
  return (
    <ScreenContainer scroll>
      <View style={styles.wrap}>
        <AppText variant="h2">{t('insights.about.heading')}</AppText>
        <AppText variant="subtitle">{t('insights.about.sub')}</AppText>
        <Card style={styles.questions}>
          <ProfileQuestions continueOnError onFinished={() => resetAfterSignIn(navigation, then)} />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  questions: {
    marginTop: spacing.md,
  },
});

export default AboutYou;
