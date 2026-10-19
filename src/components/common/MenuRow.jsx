import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Chevron from './Chevron';
import { colors, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';

// One tappable settings row: label, optional value text, and a ">" chevron.
// `danger` shows the label in red (e.g. Delete Account).
function MenuRow({ label, value, onPress, danger = false, showDivider = false }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, showDivider && styles.divider, pressed && styles.pressed]}
    >
      <AppText
        variant="subtitle"
        color={danger ? colors.danger : colors.heading}
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </AppText>
      {value ? (
        <AppText variant="caption" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      <View style={styles.chevron}>
        <Chevron direction="right" size={ms(7)} color={colors.heading} thickness={1.6} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(44),
    paddingHorizontal: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.input,
  },
  label: {
    flex: 1,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  value: {
    maxWidth: '45%',
  },
  chevron: {
    marginRight: ms(3),
  },
});

export default MenuRow;
