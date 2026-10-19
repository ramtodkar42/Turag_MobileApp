import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import CheckCircle from './CheckCircle';
import { colors, radius, shadows, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';

// Tappable card: icon + title + optional subtitle.
// Pass `selected` (true/false) to use it as a radio option: red border + tick.
function ActionCard({
  icon,
  title,
  subtitle,
  titleColor = colors.heading,
  selected,
  onPress,
  style,
}) {
  const selectable = selected !== undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={selectable ? 'radio' : 'button'}
      accessibilityState={selectable ? { selected } : undefined}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.text}>
        <AppText variant="title" color={titleColor} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {selected ? <CheckCircle size={ms(20)} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ms(58),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  selected: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    width: ms(28),
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  subtitle: {
    fontSize: fs(10),
    lineHeight: fs(14),
  },
});

export default ActionCard;
