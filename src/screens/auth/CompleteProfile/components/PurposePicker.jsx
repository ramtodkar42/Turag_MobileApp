import { StyleSheet, View } from 'react-native';
import { AppText, ChoiceChip } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

// "What brings you to turag ?" - single choice, 2 per row.
function PurposePicker({ options, value, onChange, error, style }) {
  const t = useT();
  return (
    <View style={style}>
      <AppText variant="title">{t('auth.create.purposeTitle')}</AppText>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {options.map(option => (
          <ChoiceChip
            key={option.value}
            label={t(option.labelKey)}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
            style={styles.item}
          />
        ))}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  // Two per row: half the width minus half the gap.
  item: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  error: {
    marginTop: spacing.xs,
  },
});

export default PurposePicker;
