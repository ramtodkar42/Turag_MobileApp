import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '../../../components';
import { colors } from '../../../theme';
import { HIT_SLOP } from '../../../constants/layout';

// A small red text button on the sign-in screens ("Forgot password?",
// "Send again", "Back to sign in"), centred by default.
function TextLink({ label, onPress, disabled = false, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dim, style]}
    >
      <AppText variant="label" color={colors.primary} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'center',
  },
  dim: {
    opacity: 0.6,
  },
});

export default TextLink;
