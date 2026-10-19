import { Image, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, fonts } from '../../theme';
import { useT } from '../../i18n';

const LETTERS = require('../../assets/images/turag_letters.png'); // 700x134

// The TURAG wordmark with "SWIFTLY INNOVATING" underneath, as in the brand
// logo. The tagline is real text (crisp at any size), sized from `width` so
// it spans the letters' width.
function TuragWordmark({ width, style }) {
  const t = useT();
  return (
    <View
      style={[{ width }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="TURAG"
    >
      <Image source={LETTERS} resizeMode="contain" style={{ width, height: (width * 134) / 700 }} />
      <AppText
        numberOfLines={1}
        allowFontScaling={false}
        color={colors.primary}
        style={[
          styles.tagline,
          { fontSize: width * 0.074, lineHeight: width * 0.1, letterSpacing: width * 0.006, marginTop: width * 0.035 },
        ]}
      >
        {t('home.tagline')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tagline: {
    fontFamily: fonts.subtitle.medium,
    textAlign: 'center',
  },
});

export default TuragWordmark;
