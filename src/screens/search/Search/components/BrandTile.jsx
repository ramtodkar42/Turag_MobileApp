import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';

// "Maruti Suzuki" -> "MS"; "TVS" -> "TV".
const initialsOf = name => {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
};

// One brand in the "Popular brands" grid: its logo on a soft tile, the name
// below (a brand without a logo shows its initials). onPress(name).
function BrandTile({ brand, width, onPress }) {
  return (
    <Pressable
      onPress={() => onPress(brand.name)}
      accessibilityRole="button"
      accessibilityLabel={brand.name}
      style={({ pressed }) => [styles.wrap, { width }, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        {brand.logo ? (
          <Image source={brand.logo} resizeMode="contain" style={styles.logo} />
        ) : (
          <AppText variant="title" color={colors.primary}>
            {initialsOf(brand.name)}
          </AppText>
        )}
      </View>
      <AppText variant="label" color={colors.heading} align="center" numberOfLines={1}>
        {brand.name}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  tile: {
    width: '100%',
    aspectRatio: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.input,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});

export default memo(BrandTile);
