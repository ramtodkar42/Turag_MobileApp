import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';

const DOT = { urgent: colors.primary, normal: colors.heading, info: colors.placeholder };

// One line of "Needs your action" on the dealer Overview: a coloured dot
// (urgent red / normal / info grey), what and why, and the one button that
// goes there (optional). divider: a line above it (not on the first).
function ActionRow({ tone = 'normal', title, detail, actionLabel, onAction, divider }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: DOT[tone] ?? DOT.normal }]} />
          <AppText variant="label" color={colors.heading} style={styles.flex}>
            {title}
          </AppText>
        </View>
        <AppText variant="caption" style={styles.detail}>
          {detail}
        </AppText>
      </View>
      {actionLabel ? (
        <Button
          title={actionLabel}
          size="sm"
          variant={tone === 'urgent' ? 'primary' : 'outline'}
          fullWidth={false}
          onPress={onAction}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const DOT_SIZE = ms(9);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.md,
    rowGap: spacing.sm,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  text: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: ms(200),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  flex: {
    flex: 1,
  },
  detail: {
    marginTop: spacing.xs,
    marginLeft: DOT_SIZE + spacing.sm,
  },
  button: {
    marginLeft: 'auto',
  },
});

export default ActionRow;
