import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon, Spinner } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// A friendly place to add a photo or a document - a soft dashed box with an icon,
// what to add and one line on what happens; the whole box is the button (rather
// than one more big red button). busy: a spinner and busyText, not tappable.
function UploadTile({ icon = 'camera', title, subtitle, busy = false, busyText, disabled = false, onPress, style }) {
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <View style={styles.icon}>
        {busy ? <Spinner size={ms(20)} /> : <Icon name={icon} size={ms(22)} color={colors.primary} />}
      </View>
      <View style={styles.text}>
        <AppText style={styles.title}>{busy && busyText ? busyText : title}</AppText>
        {subtitle && !busy ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {busy ? null : <Icon name="chevronRight" size={ms(16)} color={colors.primary} strokeWidth={2.2} />}
    </Pressable>
  );
}

const ICON = ms(44);

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.unreadTint,
  },
  pressed: {
    backgroundColor: colors.dangerLight,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  text: {
    flex: 1,
    gap: ms(2),
  },
  title: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(15),
    lineHeight: fs(20),
    color: colors.heading,
  },
});

export default UploadTile;
