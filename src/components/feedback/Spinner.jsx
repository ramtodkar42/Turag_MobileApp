import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Red ring loader from the "Hold On" / "Publishing" screens.
function Spinner({ size = ms(64), color = colors.primary, trackColor = colors.dangerLight }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: size * 0.14,
        borderColor: trackColor,
        borderTopColor: color,
        borderRightColor: color,
        transform: [{ rotate }],
      }}
    />
  );
}

export default Spinner;
