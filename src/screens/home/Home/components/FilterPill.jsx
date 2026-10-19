import { Pressable, StyleSheet } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// A dropdown pill: icon, label (or the chosen value) and a small down arrow.
// active: a value is chosen - red outline, soft red fill, red text.
function FilterPill({ icon, label, active = false, onPress, accessibilityLabel }) {
  const tint = active ? colors.primary : colors.body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.pill, active && styles.active, pressed && styles.pressed]}
    >
      <Icon name={icon} size={ms(15)} color={tint} strokeWidth={1.8} />
      <AppText numberOfLines={1} color={active ? colors.primary : colors.heading} style={[styles.label, active && styles.labelActive]}>
        {label}
      </AppText>
      <Icon name="chevronDown" size={ms(12)} color={tint} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Border stays 1px in both states so the row doesn't shift on select.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(6),
    height: ms(36),
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  active: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: fonts.title.medium,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  labelActive: {
    fontFamily: fonts.title.bold,
  },
});

export default FilterPill;
