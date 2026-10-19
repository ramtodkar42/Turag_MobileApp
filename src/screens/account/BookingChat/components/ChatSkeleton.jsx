import { StyleSheet, View } from 'react-native';
import { SkeletonBox, SkeletonPulse } from '../../../../components';
import { radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';

// Their messages on the left, mine on the right, in varied widths.
const BUBBLES = [
  { mine: false, width: '62%', height: ms(44) },
  { mine: true, width: '48%', height: ms(40) },
  { mine: false, width: '70%', height: ms(58) },
  { mine: true, width: '56%', height: ms(40) },
  { mine: false, width: '40%', height: ms(40) },
];

// Grey bubbles shaped like a conversation, while the chat first loads.
function ChatSkeleton() {
  return (
    <SkeletonPulse style={styles.list}>
      {BUBBLES.map((bubble, index) => (
        <View key={index} style={[styles.row, bubble.mine && styles.mine]}>
          <SkeletonBox
            width={bubble.width}
            height={bubble.height}
            style={[styles.bubble, bubble.mine ? styles.cornerMine : styles.cornerTheirs]}
          />
          <SkeletonBox width={ms(44)} height={ms(8)} style={styles.meta} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  row: {
    alignItems: 'flex-start',
  },
  mine: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: radius.xl,
  },
  // Same pointed corner as real bubbles.
  cornerMine: {
    borderTopRightRadius: 0,
  },
  cornerTheirs: {
    borderBottomLeftRadius: 0,
  },
  meta: {
    marginTop: spacing.xs,
  },
});

export default ChatSkeleton;
