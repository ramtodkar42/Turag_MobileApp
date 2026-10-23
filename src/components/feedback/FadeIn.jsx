import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { ms } from '../../utils/responsive';

// Fades children in while sliding them up a little (new chat messages, list items).
// While it fades, Android draws the children as one layer (offscreen), so
// cards with shadows inside fade in with their shadows - without it Android
// paints the shadows solid black for a moment (a dark flash).
function FadeIn({ children, duration = 260, offset = ms(12), style }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [fading, setFading] = useState(true);

  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true });
    animation.start(() => setFading(false));
    return () => animation.stop();
  }, [progress, duration]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });

  return (
    <Animated.View
      // Only during the fade (a layer costs memory; afterwards it's not needed).
      renderToHardwareTextureAndroid={fading}
      needsOffscreenAlphaCompositing={fading}
      style={[{ opacity: progress, transform: [{ translateY }] }, style]}
    >
      {children}
    </Animated.View>
  );
}

export default FadeIn;
