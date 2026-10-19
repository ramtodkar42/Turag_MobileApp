import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, Icon } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { isAnswered } from '../useCapture';

// Before submitting: every item with its state - done, missing (required),
// photos missing, or optional - grouped as the checklist is. Tap one to go back to it.
function ReviewList({ items, answers, problems, evidenceCount, onOpen }) {
  const t = useT();
  const problemFor = code => problems.find(p => p.item.code === code);

  return (
    <View>
      {items.map((item, index) => {
        const problem = problemFor(item.code);
        let badge = { label: t('inspector.review.optional'), tone: 'neutral' };
        if (problem?.kind === 'answer') {
          badge = { label: t('inspector.review.missing'), tone: 'danger' };
        } else if (problem?.kind === 'evidence') {
          badge = { label: t('inspector.review.photosMissing'), tone: 'warning' };
        } else if (isAnswered(answers[item.code])) {
          badge = { label: t('inspector.review.done'), tone: 'success' };
        }
        const newGroup = index === 0 || items[index - 1].groupLabel !== item.groupLabel;
        return (
          <View key={item.code}>
            {newGroup ? (
              <AppText variant="caption" style={styles.group}>
                {item.groupLabel}
              </AppText>
            ) : null}
            <Pressable
              onPress={() => onOpen(index)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.text}>
                <AppText variant="label" color={colors.heading} numberOfLines={2}>
                  {item.label}
                </AppText>
                {item.evidence ? (
                  <AppText variant="caption">
                    {t('inspector.review.files', {
                      done: evidenceCount(item),
                      total: item.evidence.shotCodes.length,
                    })}
                  </AppText>
                ) : null}
              </View>
              <Badge label={badge.label} tone={badge.tone} size="sm" />
              <Icon name="chevronRight" size={ms(14)} color={colors.placeholder} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
  },
});

export default memo(ReviewList);
