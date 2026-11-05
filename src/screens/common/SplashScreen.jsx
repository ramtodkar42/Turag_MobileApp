import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import TuragWordmark from '../../components/common/TuragWordmark';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// The same size as the native splash's logo, so nothing jumps at the hand-off.
const WORDMARK_W = ms(170);

// The branded launch screen shown while the app boots: the TURAG wordmark
// centered on white, fading in. Plain white to match the native splash
// underneath, so the hand-off is seamless.
function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fade }}>
        <TuragWordmark width={WORDMARK_W} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SplashScreen;
