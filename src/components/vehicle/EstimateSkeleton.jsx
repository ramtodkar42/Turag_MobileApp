import { StyleSheet, View } from 'react-native';
import SkeletonBox from '../feedback/SkeletonBox';
import SkeletonPulse from '../feedback/SkeletonPulse';
import { colors, radius, spacing } from '../../theme';
import { fs } from '../../utils/responsive';

const BAND_ROWS = 4;

// Grey cards shaped like a price estimate (ValueCard + "Price bands"), shown
// while the estimate loads. Flat (light outline, no shadow): a shadow inside
// the fading pulse draws as a heavy dark border on Android.
function EstimateSkeleton({ style }) {
  return (
    <SkeletonPulse style={style}>
      <View style={styles.card}>
        <SkeletonBox width="38%" height={fs(11)} />
        <SkeletonBox width="62%" height={fs(28)} style={styles.value} />
        <SkeletonBox width="55%" height={fs(17)} style={styles.title} />
        <SkeletonBox width="92%" height={fs(11)} style={styles.line} />
        <SkeletonBox width="70%" height={fs(11)} style={styles.line} />
      </View>

      <View style={[styles.card, styles.bands]}>
        <SkeletonBox width="35%" height={fs(16)} />
        {Array.from({ length: BAND_ROWS }).map((_, index) => (
          <View key={index} style={styles.row}>
            <SkeletonBox width="28%" height={fs(12)} />
            <SkeletonBox width="36%" height={fs(12)} />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  value: {
    marginTop: spacing.sm,
  },
  title: {
    marginTop: spacing.md,
  },
  line: {
    marginTop: spacing.sm,
  },
  bands: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
});

export default EstimateSkeleton;
