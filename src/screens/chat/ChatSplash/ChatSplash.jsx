import { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { AppText, PopIn, SupportBadge } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';

const NEXT_SCREEN_DELAY = 2000;

// Red Turag Support splash shown for 2 seconds before the chat opens: the same
// badge and name as the chat's header (white badge here, on red).
function ChatSplash({ navigation }) {
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace(ROUTES.CHAT), NEXT_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PopIn style={styles.content}>
        <SupportBadge size={ms(64)} inverted />
        <AppText variant="h3" color={colors.white} style={styles.title}>
          Turag {t('chat.support.title')}
        </AppText>
        <AppText variant="caption" color={colors.white} style={styles.subtitle}>
          {t('chat.support.online')}
        </AppText>
      </PopIn>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.md,
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  subtitle: {
    marginTop: spacing.xs,
    opacity: 0.85,
  },
});

export default ChatSplash;
