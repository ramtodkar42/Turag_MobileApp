import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import { colors, radius, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { useT } from '../../i18n';
import { useOnline } from '../../store/networkStore';

// A slim bar that slides down from the top when the device goes offline and
// slides away when the connection returns. Sits above every screen (mounted
// once in App), under the status bar. No icon font has a Wi-Fi glyph, so a
// small status dot carries the cue (not an emoji).
function OfflineBanner() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const anim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown

  useEffect(() => {
    Animated.timing(anim, {
      toValue: online ? 0 : 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [online, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-ms(80), 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing.xs, opacity: anim, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.dot} />
        <AppText variant="label" color={colors.white} numberOfLines={1} style={styles.text}>
          {t('common.offline')}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.heading,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  dot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.danger,
  },
  text: {
    fontSize: fs(12),
  },
});

export default OfflineBanner;
