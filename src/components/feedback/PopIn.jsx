import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Springs its children in (fade + scale). Used for success icons and images.
function PopIn({ children, delay = 0, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      delay,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>{children}</Animated.View>
  );
}

export default PopIn;
