import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '../../../../components';
import { colors, fonts } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs } from '../../../../utils/responsive';

// A plain white text link on the red Login screen.
function LoginLink({ label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      <AppText color={colors.white} style={styles.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  pressed: {
    opacity: 0.7,
  },
});

export default LoginLink;
