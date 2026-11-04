import { StyleSheet, View } from 'react-native';
import { AppText, ChoiceChip } from '../../components';
import { colors, spacing } from '../../theme';

// A labelled group of answer chips that wrap to fit the screen.
// options: [{ value, label }]; isSelected(value); onToggle(value).
function ChipChoices({ label, labelVariant = 'label', hint, options, isSelected, onToggle, chipStyle, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.heading}>
        <AppText variant={labelVariant} color={colors.heading}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color={colors.muted}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={styles.row}>
        {options.map(option => (
          <ChoiceChip
            key={option.value}
            label={option.label}
            selected={isSelected(option.value)}
            onPress={() => onToggle(option.value)}
            style={chipStyle}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  heading: {
    gap: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

export default ChipChoices;
