import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from '../../../../components';
import { colors, fonts } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Round progress (0..1) with the percentage inside, in the brand red (green
// when complete). The arc glides to its new value.
function ProgressRing({ fraction, size = ms(64) }) {
  const stroke = ms(6);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = Math.min(Math.max(fraction || 0, 0), 1);
  const progress = useRef(new Animated.Value(value)).current;
  const [shown, setShown] = useState(value);

  useEffect(() => {
    Animated.timing(progress, { toValue: value, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    setShown(value);
  }, [value, progress]);

  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
  const complete = shown >= 1;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={complete ? colors.successLight : colors.dangerLight} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={complete ? colors.success : colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <AppText style={[styles.value, complete && { color: colors.success }]}>{`${Math.round(shown * 100)}%`}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.title.bold,
    fontSize: fs(15),
    lineHeight: fs(20),
    color: colors.heading,
  },
});

export default ProgressRing;
