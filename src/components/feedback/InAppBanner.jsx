import { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import IconTile from '../common/IconTile';
import { colors, radius, shadows, spacing } from '../../theme';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import { fs, ms } from '../../utils/responsive';

// How long a banner stays before sliding away by itself.
export const BANNER_SHOW_MS = 4500;
const HIDDEN = -ms(160);
// A swipe up this far (or a quick flick) dismisses it.
const SWIPE_CLOSE = -ms(24);

// A notification banner that slides down from the top of the screen (like
// Instagram's), with an icon, a bold title and up to two lines of text.
// Tap: onPress. Swipe up, or wait BANNER_SHOW_MS: onHide.
// banner: { id, title, body } | null - a new id shows it again.
function InAppBanner({ banner, onPress, onHide, accessibilityHint }) {
  const insets = useSafeAreaInsets();
  const offset = useRef(new Animated.Value(HIDDEN)).current;
  const timer = useRef(null);
  // The latest onHide for the animation / gesture callbacks.
  const hideRef = useRef(onHide);
  hideRef.current = onHide;

  const slideOut = useRef(() => {
    clearTimeout(timer.current);
    Animated.timing(offset, { toValue: HIDDEN, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        hideRef.current?.();
      }
    });
  }).current;

  // A new banner: slide in, then out after a while.
  useEffect(() => {
    if (!banner) {
      return undefined;
    }
    offset.setValue(HIDDEN);
    Animated.spring(offset, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(slideOut, BANNER_SHOW_MS);
    return () => clearTimeout(timer.current);
  }, [banner, offset, slideOut]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => clearTimeout(timer.current),
      // Follows the finger upwards only (a little give downwards).
      onPanResponderMove: (_, g) => offset.setValue(Math.min(g.dy, ms(12))),
      onPanResponderRelease: (_, g) => {
        if (g.dy < SWIPE_CLOSE || g.vy < -0.6) {
          slideOut();
        } else {
          Animated.spring(offset, { toValue: 0, useNativeDriver: true }).start();
          timer.current = setTimeout(slideOut, BANNER_SHOW_MS);
        }
      },
    }),
  ).current;

  if (!banner) {
    return null;
  }

  return (
    <Animated.View
      {...pan.panHandlers}
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + spacing.xs, transform: [{ translateY: offset }] }]}
    >
      <Pressable
        onPress={() => {
          slideOut();
          onPress?.();
        }}
        accessibilityRole="alert"
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <IconTile name="bell" size={ms(48)} />
        <View style={styles.text}>
          {banner.title ? (
            <AppText variant="title" numberOfLines={1} style={styles.title}>
              {banner.title}
            </AppText>
          ) : null}
          {banner.body ? (
            <AppText variant="caption" color={colors.body} numberOfLines={2} style={styles.body}>
              {banner.body}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 20,
  },
  card: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH - spacing.md * 2,
    minHeight: ms(76),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
    ...shadows.lg,
  },
  pressed: {
    opacity: 0.92,
  },
  text: {
    flex: 1,
    gap: ms(2),
  },
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  body: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
});

export default InAppBanner;
