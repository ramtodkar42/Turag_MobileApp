import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { AppText, Spinner } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const FADE_MS = 220;

// The support chat's one loader: the app's red spinner and "Connecting you to
// Turag support…", always centred in the same place - from opening until the
// conversation is on screen (the page's own grey spinners are hidden). Fades
// out smoothly instead of vanishing in one frame. visible: still loading.
function ChatLoader({ visible }) {
  const t = useT();
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.setValue(1);
      return undefined;
    }
    const fade = Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true });
    fade.start(({ finished }) => finished && setMounted(false));
    return () => fade.stop();
  }, [visible, opacity]);

  if (!mounted) {
    return null;
  }
  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <Spinner size={ms(52)} />
      <AppText variant="subtitle" align="center" style={styles.text}>
        {t('chat.support.connecting')}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.white,
  },
  text: {
    marginTop: spacing.lg,
  },
});

export default ChatLoader;
