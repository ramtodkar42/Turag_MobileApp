import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';

// `dense`: small text and tight rows (vehicle details, price bands).
function KeyValueRow({
  label,
  value,
  valueColor = colors.heading,
  showDivider = true,
  dense = false,
  stacked = false,
}) {
  const textStyle = dense && styles.denseText;

  return (
    <View
      style={[
        styles.row,
        dense && styles.denseRow,
        stacked && styles.stackedRow,
        showDivider && styles.divider,
      ]}
    >
      <AppText
        variant="subtitle"
        color={dense ? colors.heading : undefined}
        style={[styles.label, stacked && styles.stackedLabel, textStyle]}
      >
        {label}
      </AppText>
      {typeof value === 'string' || typeof value === 'number' ? (
        <AppText
          variant="subtitle"
          color={valueColor}
          align={stacked ? 'left' : 'right'}
          style={[styles.value, stacked && styles.stackedValue, textStyle]}
        >
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  denseRow: {
    paddingVertical: ms(5),
  },
  stackedRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.xxs,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  // The label always keeps room for itself; a long value (e.g. an account ID)
  // wraps onto more lines instead of squeezing the label to one letter per line
  // on narrow phones or with a bigger system font.
  label: {
    flex: 1,
    minWidth: '35%',
  },
  value: {
    flexShrink: 1,
    maxWidth: '60%',
  },
  stackedLabel: {
    flex: 0,
    minWidth: 0,
  },
  stackedValue: {
    width: '100%',
    maxWidth: '100%',
  },
  denseText: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
});

export default KeyValueRow;
