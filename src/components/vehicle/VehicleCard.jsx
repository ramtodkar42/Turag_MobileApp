import { Pressable, StyleSheet, View } from 'react-native';
import VehicleImage from './VehicleImage';
import AppText from '../common/AppText';
import Badge from '../common/Badge';
import { colors, radius, shadows, spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Marketplace grid card. Parent decides columns via getGridColumns().
function VehicleCard({ image, loading, title, meta = [], price, badge, topRight, onPress, style }) {
  const details = [...meta, price].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View>
        <VehicleImage source={image} loading={loading} style={styles.image} />
        {badge ? <Badge label={badge} tone="verified" size="sm" style={styles.badge} /> : null}
        {topRight ? <View style={styles.topRight}>{topRight}</View> : null}
      </View>
      <AppText variant="title" align="center" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.meta}>
        {details.map(item => (
          <AppText key={item} variant="caption" numberOfLines={1} style={styles.metaText}>
            {item}
          </AppText>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    width: '100%',
    aspectRatio: 1.3,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  topRight: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  // Smaller than the default title/caption so long names fit in 2 columns.
  title: {
    marginTop: spacing.sm,
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
    marginBottom: spacing.xs,
  },
  metaText: {
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default VehicleCard;
