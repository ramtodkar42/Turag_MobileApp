import { StyleSheet, View, Pressable } from 'react-native';
import { AppText, Badge, Icon } from '../../../components';
import { colors, radius, shadows, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';

// One list card used across the Business screens: a title with a status
// badge, then caption lines, then an optional footer (price, actions).
// Tappable (with a chevron) when `onPress` is given.
// badge: { label, tone } | null;  lines: strings (empty ones are skipped)
function RowCard({ title, badge, lines = [], footer, onPress, accessibilityLabel, style }) {
  const content = (
    <>
      <View style={styles.top}>
        <AppText variant="title" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        {badge ? <Badge label={badge.label} tone={badge.tone} size="sm" /> : null}
        {onPress ? <Icon name="chevronRight" size={ms(14)} color={colors.placeholder} /> : null}
      </View>
      {lines.filter(Boolean).map((line, i) => (
        <AppText key={`${i}-${line}`} variant="caption" style={styles.line}>
          {line}
        </AppText>
      ))}
      {footer}
    </>
  );
  if (!onPress) {
    return <View style={[styles.card, style]}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  pressed: {
    opacity: 0.85,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  line: {
    marginTop: spacing.xxs,
  },
});

export default RowCard;
