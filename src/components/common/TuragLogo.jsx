import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

const VARIANTS = {
  red: { bg: colors.primary, dot: colors.white }, // on white screens
  white: { bg: colors.white, dot: colors.primary }, // on the red splash
};

// TURAG.AI mark: rounded pill with two dots. Size is driven by `height`.
function TuragLogo({ height = ms(16), variant = 'red', ratio = 2.2, style }) {
  const v = VARIANTS[variant];
  const dot = height * 0.32;

  return (
    <View
      style={[
        styles.pill,
        {
          width: height * ratio,
          height,
          borderRadius: height / 2,
          paddingHorizontal: height * 0.3,
          backgroundColor: v.bg,
        },
        style,
      ]}
    >
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: v.dot }} />
      <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: v.dot }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default TuragLogo;
