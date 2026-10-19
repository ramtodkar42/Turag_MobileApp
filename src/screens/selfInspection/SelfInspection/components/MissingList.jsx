import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "Before you can submit": each entry jumps to where it's done (the web's MissingList).
// entries: [{ step, itemCode, label }] with `label` already translated.
function MissingList({ entries, onGo }) {
  const t = useT();
  return (
    <View style={styles.list}>
      {entries.map(entry => (
        <Pressable
          key={`${entry.itemCode ?? ''}|${entry.label}`}
          onPress={() => onGo(entry)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.dot} />
          <AppText variant="label" color={colors.heading} style={styles.label}>
            {entry.label}
          </AppText>
          <AppText style={styles.step}>{t(`selfInspection.step.${entry.step}`)}</AppText>
          <Icon name="chevronRight" size={ms(14)} color={colors.primary} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(48),
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  pressed: {
    backgroundColor: colors.dangerLight,
  },
  dot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
  },
  step: {
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.placeholder,
  },
});

export default MissingList;
