import { StyleSheet, View } from 'react-native';
import { AppText, Header, InfoNote, ScreenContainer } from '../../../components';
import { colors, radius, shadows, spacing } from '../../../theme';
import { LANGUAGES, setLanguage, useLanguage, useT } from '../../../i18n';
import LanguageOption from './components/LanguageOption';

// Profile > Language: pick the app language. Applies at once to every screen
// and is remembered on this phone. Each language is written in its own script
// (with the English name below), so anyone can find theirs.
function Language({ navigation }) {
  const t = useT();
  const current = useLanguage();

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} title={t('profile.language.title')} />}
    >
      <AppText variant="subtitle" style={styles.subtitle}>
        {t('profile.language.subtitle')}
      </AppText>

      <View style={styles.list} accessibilityRole="radiogroup">
        {LANGUAGES.map((language, index) => (
          <LanguageOption
            key={language.code}
            language={language}
            selected={language.code === current}
            showDivider={index < LANGUAGES.length - 1}
            selectedLabel={t('profile.language.selected')}
            onPress={() => setLanguage(language.code)}
          />
        ))}
      </View>

      <InfoNote style={styles.note}>{t('profile.language.note')}</InfoNote>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.xl,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  note: {
    marginTop: spacing.xl,
  },
});

export default Language;
