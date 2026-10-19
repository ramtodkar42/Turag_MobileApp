import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import BotAvatar from './BotAvatar';

const DOTS = [0, 1, 2];

// Three bouncing dots while TURAG.AI is replying.
function TypingIndicator() {
  const t = useT();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View style={styles.container} accessibilityLabel={t('chat.typing')}>
      <View style={styles.bubble}>
        {DOTS.map(i => {
          // Each dot rises in turn: dot 0 at the start, dot 1 a third later, ...
          const start = i / 3;
          const translateY = progress.interpolate({
            inputRange: [0, start, start + 0.15, start + 0.3, 1],
            outputRange: [0, 0, -ms(4), 0, 0],
            extrapolate: 'clamp',
          });
          return <Animated.View key={i} style={[styles.dot, { transform: [{ translateY }] }]} />;
        })}
      </View>
      <BotAvatar />
    </View>
  );
}

const DOT = ms(7);

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  bubble: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderBottomLeftRadius: 0, // same shape as TURAG.AI reply bubbles
    backgroundColor: colors.imagePlaceholder,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.placeholder,
  },
});

export default TypingIndicator;
