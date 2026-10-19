import { StyleSheet, View } from 'react-native';
import SkeletonBox from './SkeletonBox';
import SkeletonPulse from './SkeletonPulse';
import { colors, radius, spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Varied line widths so the cards don't look copy-pasted.
const WIDTHS = ['72%', '90%', '58%', '80%', '46%'];

// Grey cards for a details / list page's first load.
// cards: lines per card, e.g. [2, 4, 3].
// Flat (light outline, no shadow): a shadow inside the fading pulse draws as a
// heavy dark border on Android.
function CardListSkeleton({ cards = [2, 4, 3], style }) {
  return (
    <SkeletonPulse style={[styles.list, style]}>
      {cards.map((lines, card) => (
        <View key={card} style={styles.card}>
          <SkeletonBox width="40%" height={fs(15)} />
          {Array.from({ length: lines }, (_, line) => (
            <SkeletonBox
              key={line}
              width={WIDTHS[(card + line) % WIDTHS.length]}
              height={fs(12)}
              style={styles.line}
            />
          ))}
        </View>
      ))}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  line: {
    marginTop: spacing.md,
  },
});

export default CardListSkeleton;
