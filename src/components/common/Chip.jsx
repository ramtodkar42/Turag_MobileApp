import { Pressable, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius, spacing } from '../../theme';

// The two looks: soft (grey; picked = red outline) and outline (red outline
// and text; picked = filled red, white text - e.g. Home's filters).
const LOOKS = {
  soft: { text: colors.body, count: colors.placeholder, on: colors.primary, onCount: colors.primary },
  outline: { text: colors.primary, count: colors.primary, on: colors.white, onCount: colors.white },
};

// count: optional small number after the label ("Exterior 7").
// look: 'soft' (default) | 'outline'.
function Chip({
  label,
  count,
  selected = false,
  look = 'soft',
  onPress,
  accessibilityRole = 'button',
  accessibilityLabel,
  style,
}) {
  const tone = LOOKS[look];
  const outline = look === 'outline';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        outline ? styles.outline : selected && styles.selected,
        outline && selected && styles.outlineOn,
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppText
        variant="label"
        color={selected ? tone.on : tone.text}
        numberOfLines={1}
        adjustsFontSizeToFit={outline}
        minimumFontScale={0.8}
      >
        {label}
        {count != null ? (
          <AppText variant="label" color={selected ? tone.onCount : tone.count}>
            {` ${count}`}
          </AppText>
        ) : null}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Border stays 1px (transparent when not selected) so chips don't shift on tap.
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.pill,
    backgroundColor: colors.input,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  outline: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  outlineOn: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default Chip;
