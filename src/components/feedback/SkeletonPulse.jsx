import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { useT } from '../../i18n';

const DURATION = 750;
const DIM = 0.45;

// Wraps loading placeholders (SkeletonBox) in one soft pulsing fade.
// One native-driver animation for the whole group keeps it smooth even with
// many rows. Stays still when the phone's "reduce motion" setting is on.
function SkeletonPulse({ children, style }) {
  const t = useT();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop = null;
    let active = true;
    const pulse = Animated.sequence([
      Animated.timing(opacity, { toValue: DIM, duration: DURATION, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: DURATION, useNativeDriver: true }),
    ]);

    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (active && !reduce) {
          loop = Animated.loop(pulse);
          loop.start();
        }
      });

    return () => {
      active = false;
      loop?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity }, style]}
      accessible
      accessibilityLabel={t('common.loading')}
      accessibilityState={{ busy: true }}
    >
      {children}
    </Animated.View>
  );
}

export default SkeletonPulse;
