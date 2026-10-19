import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, radius, shadows, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// options: [{ label: 'Self Inspection', value: 'self' }, ...]
function SegmentedControl({ options, value, onChange, style }) {
  return (
    <View style={[styles.container, style]} accessibilityRole="tablist">
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange?.(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.active]}
          >
            <AppText
              variant="label"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              color={active ? colors.white : colors.primary}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  segment: {
    flex: 1,
    height: ms(34),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  active: {
    backgroundColor: colors.primary,
  },
});

export default SegmentedControl;
