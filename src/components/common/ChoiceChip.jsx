import { Pressable, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, radius, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// Bordered option pill for single-choice questions ("What brings you to turag?").
// Selected: red border + light red fill.
function ChoiceChip({ label, selected = false, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppText
        variant="label"
        align="center"
        numberOfLines={2}
        color={selected ? colors.primary : colors.body}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: ms(44),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default ChoiceChip;
