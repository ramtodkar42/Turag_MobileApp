import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

const WORDMARK = require('../../assets/images/turag_wordmark.png'); // 700x178

const WORDMARK_W = ms(210);

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
      <Animated.Image
        source={WORDMARK}
        resizeMode="contain"
        style={[styles.wordmark, { opacity: fade }]}
      />
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
  wordmark: {
    width: WORDMARK_W,
    height: (WORDMARK_W * 178) / 700,
  },
});

export default SplashScreen;
