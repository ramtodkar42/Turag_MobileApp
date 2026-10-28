import { StyleSheet, View } from 'react-native';
import Icon from '../icons/Icon';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Turag Support's badge: a white life ring on a red rounded square (as the
// web's support widget). The same mark on the Home button, the red splash and
// the support chat's header. `inverted`: red ring on white (on red screens).
function SupportBadge({ size = ms(40), inverted = false, style }) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: inverted ? colors.white : colors.primary,
        },
        style,
      ]}
    >
      <Icon
        name="lifebuoy"
        size={size * 0.5}
        color={inverted ? colors.primary : colors.white}
        strokeWidth={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SupportBadge;
