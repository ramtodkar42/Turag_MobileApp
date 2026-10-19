import { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { AppText, PopIn, TuragLogo } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';

const NEXT_SCREEN_DELAY = 2000;

// Red TURAG.AI splash shown for 2 seconds before the chat opens.
function ChatSplash({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace(ROUTES.CHAT), NEXT_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PopIn style={styles.content}>
        <TuragLogo height={ms(48)} variant="white" />
        <AppText variant="h3" color={colors.white} style={styles.title}>
          TURAG.AI
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
    marginTop: spacing.sm,
    fontSize: fs(20),
    lineHeight: fs(26),
  },
});

export default ChatSplash;
