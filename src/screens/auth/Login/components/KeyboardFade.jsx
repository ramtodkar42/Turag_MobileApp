import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const FADE_MS = 180;

// Fades its content out while typing and back when the keyboard closes - it
// stays in place (nothing is added or removed, so nothing else on the screen
// moves or re-lays out: no blink). Hidden content can't be tapped.
// hidden: the keyboard is open.
function KeyboardFade({ hidden, style, children }) {
  const opacity = useRef(new Animated.Value(hidden ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: hidden ? 0 : 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [hidden, opacity]);

  return (
    <Animated.View
      style={[style, { opacity }]}
      pointerEvents={hidden ? 'none' : 'auto'}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={hidden}
    >
      {children}
    </Animated.View>
  );
}

export default KeyboardFade;
