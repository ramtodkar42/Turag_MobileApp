import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Icon from '../icons/Icon';
import IconButton from '../common/IconButton';
import IconTile from '../common/IconTile';
import { colors, fonts, radius, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';

// The close X's size (and the room a row without one keeps).
const X = ms(28);

// One light row on Home (the business card, "pick up where you left off", the optional
// questions): an icon, a message (and an optional short line under it), a small outlined
// action and, when it can be closed, an X. A row without an X keeps the X's room, so
// the actions of rows stacked together line up in one column.
// - onPress: the whole row is the button; `actionLabel` just says what a tap does.
// - onClose + closeLabel: the X (e.g. "Hide", "Not now"). Leave out for a row that stays.
// - tone: 'tint' (light red, something of the user's own) | 'plain' (white, a request).
function NoticeRow({
  icon,
  message,
  detail,
  actionLabel,
  onPress,
  onClose,
  closeLabel,
  accessibilityHint,
  tone = 'tint',
  style,
}) {
  const plain = tone === 'plain';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${message}, ${detail}` : message}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, plain ? styles.plain : styles.tint, pressed && styles.pressed, style]}
    >
      <IconTile name={icon} size={ms(34)} backgroundColor={plain ? colors.dangerLight : colors.white} />
      {/* Wraps onto another line rather than being cut short (Hindi / Marathi run longer). */}
      <View style={styles.text}>
        <AppText style={styles.message}>{message}</AppText>
        {detail ? (
          <AppText variant="caption" color={colors.body}>
            {detail}
          </AppText>
        ) : null}
      </View>
      <View style={styles.action}>
        <AppText variant="label" color={colors.primary} style={styles.actionText}>
          {actionLabel}
        </AppText>
      </View>
      {onClose ? (
        <IconButton onPress={onClose} size={X} backgroundColor="transparent" accessibilityLabel={closeLabel}>
          <Icon name="close" size={ms(14)} color={colors.placeholder} strokeWidth={2.2} />
        </IconButton>
      ) : (
        <View style={styles.xRoom} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xxs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tint: {
    borderColor: colors.dangerLight,
    backgroundColor: colors.unreadTint,
  },
  plain: {
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    flex: 1,
  },
  message: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(14),
    lineHeight: fs(19),
    color: colors.heading,
  },
  // Every row's action is the same size, so they line up.
  action: {
    height: ms(26),
    minWidth: ms(64),
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  actionText: {
    fontSize: fs(12),
    lineHeight: fs(16),
  },
  xRoom: {
    width: X,
  },
});

export default NoticeRow;
