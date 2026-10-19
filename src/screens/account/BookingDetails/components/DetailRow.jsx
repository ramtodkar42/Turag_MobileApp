import { StyleSheet, View } from 'react-native';
import { AppText, IconTile } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// One line of "Inspection details": icon tile + label on the left, the value
// (any content, right-aligned) on the right; a divider under all but the last.
function DetailRow({ icon, label, children, last = false }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.left}>
        <IconTile name={icon} size={ms(32)} />
        <AppText variant="subtitle" color={colors.body} style={styles.label}>
          {label}
        </AppText>
      </View>
      <View style={styles.value}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
    maxWidth: '50%',
  },
  label: {
    flexShrink: 1,
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  value: {
    flex: 1,
    alignItems: 'flex-end',
  },
});

export default DetailRow;
