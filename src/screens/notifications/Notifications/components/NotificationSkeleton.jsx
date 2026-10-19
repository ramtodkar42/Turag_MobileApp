import { StyleSheet, View } from 'react-native';
import { SkeletonBox, SkeletonPulse } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

const ROWS = 6;
// Varied line widths so the rows don't look copy-pasted.
const WIDTHS = [
  ['70%', '95%', '60%'],
  ['55%', '85%', '40%'],
  ['65%', '90%', '70%'],
];

// Grey rows shaped like NotificationItem, shown only on the very first load.
function NotificationSkeleton() {
  return (
    <SkeletonPulse style={styles.container}>
      <SkeletonBox width={ms(64)} height={fs(16)} />
      {Array.from({ length: ROWS }, (_, index) => {
        const [title, line1, line2] = WIDTHS[index % WIDTHS.length];
        return (
          <View key={index} style={styles.row}>
            <SkeletonBox circle height={ms(42)} />
            <View style={styles.lines}>
              <SkeletonBox width={title} height={fs(13)} />
              <SkeletonBox width={line1} height={fs(11)} />
              <SkeletonBox width={line2} height={fs(11)} />
            </View>
          </View>
        );
      })}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lines: {
    flex: 1,
    gap: spacing.sm,
    paddingTop: spacing.xxs,
  },
});

export default NotificationSkeleton;
