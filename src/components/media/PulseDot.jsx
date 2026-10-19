import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Blinking red dot shown while recording.
function PulseDot({ color = colors.primary }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />;
}

const SIZE = ms(10);

const styles = StyleSheet.create({
  dot: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
});

export default PulseDot;
