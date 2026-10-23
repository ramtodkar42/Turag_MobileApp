import { Pressable, StyleSheet } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';

// One filter pill on My jobs (a status, Today, a date, a select), the same
// look as the app's list toolbar. icon: optional element before the label;
// onClear: shows an x that clears just this filter.
function FilterPill({ label, selected = false, onPress, icon, onClear, clearLabel, accessibilityRole = 'button' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.pill, selected && styles.pillOn, pressed && styles.pressed]}
    >
      {icon}
      <AppText style={[styles.text, selected && styles.textOn]} numberOfLines={1}>
        {label}
      </AppText>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel={clearLabel}>
          <Icon name="close" size={ms(13)} color={colors.primary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: ms(34),
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillOn: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12.5),
    lineHeight: fs(17),
    color: colors.body,
  },
  textOn: {
    color: colors.primary,
  },
});

export default FilterPill;
