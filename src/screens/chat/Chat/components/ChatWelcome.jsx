import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { INTRO_LINE_KEYS, SUGGESTION_GROUPS } from '../constants';
import SuggestionPill from './SuggestionPill';

// Empty state before the first message: intro lines + tappable suggestions.
function ChatWelcome({ onSelect }) {
  const t = useT();
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.group}>
        {INTRO_LINE_KEYS.map(key => (
          <SuggestionPill key={key} text={t(key)} />
        ))}
      </View>

      {SUGGESTION_GROUPS.map(group => (
        <View key={group.titleKey} style={styles.section}>
          <Icon name={group.icon} size={ms(20)} color={colors.heading} strokeWidth={1.5} />
          <AppText variant="label" color={colors.heading} style={styles.sectionTitle}>
            {t(group.titleKey)}
          </AppText>
          <View style={styles.group}>
            {group.itemKeys.map(key => (
              <SuggestionPill key={key} text={t(key)} onPress={onSelect} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  group: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  section: {
    alignItems: 'center',
    marginTop: ms(36),
  },
  sectionTitle: {
    fontFamily: fonts.title.bold,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});

export default ChatWelcome;
