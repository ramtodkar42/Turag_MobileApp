import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Green circle with a tick, drawn with borders.
function CheckCircle({ size = ms(22), color = colors.success }) {
  const stroke = Math.max(2, size * 0.09);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <View
        style={[
          styles.tick,
          {
            width: size * 0.26,
            height: size * 0.48,
            borderRightWidth: stroke,
            borderBottomWidth: stroke,
            marginTop: -size * 0.08,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    borderColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
});

export default CheckCircle;
