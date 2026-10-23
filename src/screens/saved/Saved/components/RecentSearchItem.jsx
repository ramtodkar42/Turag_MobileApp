import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, FillImage, Icon } from '../../../../components';
import { colors, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const SIZE = ms(44);

// Round vehicle photo with the search text underneath (max 2 lines).
// onPress(item): a typed search, or a brand / price picked on the search screen.
function RecentSearchItem({ item, onPress }) {
  const t = useT();
  const label = item.labelKey ? t(item.labelKey) : item.query;
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('saved.recent.a11y', { query: label })}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={styles.circle}>
        {item.image ? (
          <FillImage source={item.image} />
        ) : (
          <Icon name="search" size={ms(18)} color={colors.placeholder} />
        )}
      </View>
      <AppText variant="caption" align="center" numberOfLines={2} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: ms(60),
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
    ...shadows.sm,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: fs(10),
    lineHeight: fs(13),
  },
});

export default memo(RecentSearchItem);
