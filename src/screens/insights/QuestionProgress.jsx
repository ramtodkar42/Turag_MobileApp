import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { colors, radius, spacing } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// "Question 2 of 3" and, after the first, a way back, over one bar per question; the
// answered ones and this one are red.
function QuestionProgress({ current, total, onBack }) {
  const t = useT();
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <AppText variant="caption" color={colors.muted} style={styles.flex}>
          {t('insights.q.progress', { n: current, total })}
        </AppText>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={HIT_SLOP} accessibilityRole="button">
            <AppText variant="label" color={colors.body}>
              {t('common.back')}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.bars}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.bar, i < current && styles.barDone]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ms(20),
  },
  flex: {
    flex: 1,
  },
  bars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bar: {
    flex: 1,
    height: ms(4),
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  barDone: {
    backgroundColor: colors.primary,
  },
});

export default QuestionProgress;
