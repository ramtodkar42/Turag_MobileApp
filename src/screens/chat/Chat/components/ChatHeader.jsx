import { Image, StyleSheet, View } from 'react-native';
import { AppText, BackButton } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "TURAG.AI" in the TURAG logo's own lettering (built from the logo artwork).
const WORDMARK = require('../../../../assets/images/turag_ai_wordmark.png'); // 944x134
const WORDMARK_HEIGHT = ms(14);

// Back button + the red TURAG.AI wordmark with the "Active Now" status;
// `right`: an optional action at the end (e.g. Start over).
function ChatHeader({ onBack, right }) {
  const t = useT();
  return (
    <View style={styles.container}>
      <BackButton onPress={onBack} />
      <View style={styles.name}>
        <Image
          source={WORDMARK}
          resizeMode="contain"
          accessibilityRole="header"
          accessibilityLabel="TURAG.AI"
          style={styles.wordmark}
        />
        <View style={styles.status}>
          <View style={styles.dot} />
          <AppText variant="caption" style={styles.statusText}>
            {t('chat.activeNow')}
          </AppText>
        </View>
      </View>
      {right}
    </View>
  );
}

const DOT = ms(7);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: {
    flex: 1,
  },
  wordmark: {
    height: WORDMARK_HEIGHT,
    width: (WORDMARK_HEIGHT * 944) / 134,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: fs(10),
    lineHeight: fs(14),
  },
});

export default ChatHeader;
