import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, FadeIn, PulseDot } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// One line under the search bar saying what's happening, so a search never
// looks stuck: a voice message (e.g. "Didn't catch that") first, then
// "Listening..." with a blinking dot while the mic is on, then
// "Searching for "swift"..." with a spinner until the results arrive.
function SearchStatus({ hintKey, listening, searching, query }) {
  const t = useT();

  let content = null;
  if (hintKey) {
    content = (
      <AppText variant="caption" color={colors.primary} style={styles.text}>
        {t(hintKey)}
      </AppText>
    );
  } else if (listening) {
    content = (
      <>
        <PulseDot />
        <AppText variant="caption" color={colors.primary} style={styles.text}>
          {t('home.voice.listening')}
        </AppText>
      </>
    );
  } else if (searching) {
    content = (
      <>
        <ActivityIndicator size="small" color={colors.primary} />
        <AppText variant="caption" numberOfLines={1} style={[styles.text, styles.flex]}>
          {t('home.searching', { query: query.trim() })}
        </AppText>
      </>
    );
  }

  if (!content) {
    return null;
  }
  return (
    <FadeIn>
      <View style={styles.row} accessibilityLiveRegion="polite">
        {content}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
  },
  text: {
    fontSize: fs(12),
    lineHeight: fs(16),
  },
  flex: {
    flexShrink: 1,
  },
});

export default SearchStatus;
