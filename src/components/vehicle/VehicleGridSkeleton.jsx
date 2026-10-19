import { StyleSheet, View } from 'react-native';
import SkeletonBox from '../feedback/SkeletonBox';
import SkeletonPulse from '../feedback/SkeletonPulse';
import { colors, radius, spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Grey cards shaped like VehicleCard, for a vehicle grid's first load.
// Pass the grid's sizing (useVehicleGrid) so it matches phones and tablets.
// Flat (light outline, no shadow): a shadow inside the fading pulse draws as a
// heavy dark border on Android.
function VehicleGridSkeleton({ columns, cardWidth, gap, rows = 2, style }) {
  const cards = Array.from({ length: columns * rows });

  return (
    <SkeletonPulse style={[styles.grid, { gap, marginTop: gap }, style]}>
      {cards.map((_, index) => (
        <View key={index} style={[styles.card, { width: cardWidth }]}>
          <SkeletonBox height={cardWidth / 1.3 - spacing.sm} style={styles.image} />
          <SkeletonBox width="70%" height={fs(13)} style={styles.title} />
          <SkeletonBox width="50%" height={fs(10)} style={styles.meta} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  card: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  image: {
    width: '100%',
    borderRadius: radius.md,
  },
  title: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  meta: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
});

export default VehicleGridSkeleton;
