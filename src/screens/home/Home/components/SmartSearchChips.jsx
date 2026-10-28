import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, FadeIn, Icon } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import smartChipLabel from '../smartChipLabel';

// Smart search, as the web's filter badges: what the search was understood as
// ("Diesel", "SUV", "Up to ₹10L", "Pune"), each with an × to take it off.
// chips: useMarketplace().smart.chips; onRemove(chipKey).
function SmartSearchChips({ chips, onRemove, style }) {
  const t = useT();
  if (!chips?.length) {
    return null;
  }
  return (
    <FadeIn offset={0} style={[styles.wrap, style]}>
      <View style={styles.title}>
        <Icon name="flash" size={ms(13)} color={colors.primary} strokeWidth={2} />
        <AppText variant="caption" color={colors.body} style={styles.titleText}>
          {t('home.smart.title')}
        </AppText>
      </View>
      <View style={styles.chips}>
        {chips.map(chip => {
          const label = smartChipLabel(t, chip);
          return (
            <Pressable
              key={chip.key}
              onPress={() => onRemove(chip.key)}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t('home.smart.remove', { label })}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <AppText numberOfLines={1} color={colors.primary} style={styles.chipText}>
                {label}
              </AppText>
              <Icon name="close" size={ms(11)} color={colors.primary} strokeWidth={2.4} />
            </Pressable>
          );
        })}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  titleText: {
    fontSize: fs(11.5),
    lineHeight: fs(15),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(5),
    maxWidth: '100%',
    height: ms(28),
    paddingHorizontal: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerLight,
  },
  pressed: {
    opacity: 0.7,
  },
  chipText: {
    flexShrink: 1,
    fontFamily: fonts.title.medium,
    fontSize: fs(12),
    lineHeight: fs(16),
  },
});

export default SmartSearchChips;
