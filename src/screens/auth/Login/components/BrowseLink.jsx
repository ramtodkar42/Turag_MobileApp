import { Pressable, StyleSheet } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "Browse cars without login ›" under the OTP button (white on the red screen).
function BrowseLink({ onPress, style }) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      <AppText variant="label" color={colors.white}>
        {t('guest.browse')}
      </AppText>
      <Icon name="chevronRight" size={ms(16)} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default BrowseLink;
