import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';

const VARIANTS = {
  primary: { bg: colors.primary, border: colors.primary, text: colors.white },
  secondary: { bg: colors.border, border: colors.border, text: colors.placeholder },
  outline: { bg: colors.white, border: colors.primary, text: colors.primary },
  dark: { bg: colors.black, border: colors.black, text: colors.white },
  light: { bg: colors.white, border: colors.white, text: colors.primary }, // on red screens
  lightOutline: { bg: 'transparent', border: colors.white, text: colors.white }, // second choice on red screens
  // Soft tinted pills, e.g. Accept / Decline on inspector cards.
  successSoft: { bg: colors.successLight, border: colors.successLight, text: colors.success },
  dangerSoft: { bg: colors.dangerLight, border: colors.dangerLight, text: colors.danger },
  ghost: { bg: 'transparent', border: 'transparent', text: colors.primary },
};

const DISABLED = { bg: colors.placeholder, border: colors.placeholder, text: colors.white };

const SIZES = {
  lg: { height: ms(50), paddingHorizontal: spacing.xl },
  md: { height: ms(42), paddingHorizontal: spacing.lg },
  sm: { height: ms(30), paddingHorizontal: spacing.md },
  xs: { height: ms(24), paddingHorizontal: spacing.sm }, // compact actions inside cards
};

function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = size === 'lg',
  style,
  textStyle,
}) {
  const inactive = disabled || loading;
  const v = disabled ? DISABLED : VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        SIZES[size],
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {leftIcon}
          <AppText
            variant={size === 'sm' || size === 'xs' ? 'label' : 'button'}
            color={v.text}
            numberOfLines={1}
            style={[size === 'xs' && styles.textXs, textStyle]}
          >
            {title}
          </AppText>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  textXs: {
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default Button;
