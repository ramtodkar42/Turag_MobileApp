import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// An opacity that gently fades between 1 and `low` while `active` (e.g. cards
// "breathing" while a search runs), and settles back to 1 when it stops.
// One shared native-driver value, so many views can follow it smoothly.
export default function usePulse(active, { low = 0.45, duration = 650 } = {}) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: low, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, low, duration, opacity]);

  return opacity;
}
