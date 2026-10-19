import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { ms } from '../../utils/responsive';

// Fades children in while sliding them up a little (new chat messages, list items).
function FadeIn({ children, duration = 260, offset = ms(12), style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [progress, duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default FadeIn;
