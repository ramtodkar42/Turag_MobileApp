import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Icon from '../icons/Icon';
import { colors } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';
import { ms } from '../../utils/responsive';

// Mic button for voice search. Idle: a grey mic. Listening: a red mic with a
// soft light-red ring that breathes and grows with the voice (`level` 0..1).
// Native-driver animations, so it stays smooth while the words fill in.
function MicButton({ listening = false, level = 0, onPress, accessibilityLabel }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const voice = useRef(new Animated.Value(0)).current;

  // A slow breathing ring while listening.
  useEffect(() => {
    if (!listening) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  // The ring follows the voice level smoothly.
  useEffect(() => {
    Animated.spring(voice, { toValue: listening ? level : 0, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  }, [level, listening, voice]);

  const ringScale = Animated.add(
    pulse.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.3] }),
    voice.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
  );

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: listening }}
      style={styles.wrap}
    >
      {listening ? (
        <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }] }]} />
      ) : null}
      <View style={styles.button}>
        <Icon name="mic" size={ms(17)} color={listening ? colors.primary : colors.body} />
      </View>
    </Pressable>
  );
}

const SIZE = ms(30);

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.dangerLight,
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MicButton;
