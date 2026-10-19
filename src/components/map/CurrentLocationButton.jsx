import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import AppText from '../common/AppText';
import Icon from '../icons/Icon';
import { colors, radius, shadows, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// White pill over the map: "Use my current location" (spinner while finding it).
function CurrentLocationButton({ onPress, loading = false, style }) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      accessibilityLabel={t('booking.address.useCurrent')}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name="navigation" size={ms(16)} color={colors.primary} />
      )}
      <AppText variant="label" color={colors.heading} numberOfLines={1}>
        {t(loading ? 'booking.address.locating' : 'booking.address.useCurrent')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: ms(36),
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default CurrentLocationButton;
