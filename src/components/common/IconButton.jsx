import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';
import { ms } from '../../utils/responsive';

function IconButton({
  onPress,
  children,
  size = ms(40),
  backgroundColor = colors.input,
  accessibilityLabel,
  style,
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});

export default IconButton;
