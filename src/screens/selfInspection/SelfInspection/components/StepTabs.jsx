import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { STEPS } from '../constants';

// The four steps as one slim stepper: a small numbered circle per step joined by a
// line - red for the current step, a green tick once a step is done (its line on
// to the next one turns green too) - with the step's name and how far it is
// ("done/total"; Estimate shows the live estimate). Tap a step to open it.
function StepTabs({ current, progress, estimateLabel, onSelect }) {
  const t = useT();
  const isDone = key => {
    const c = key === 'review' ? null : progress[key];
    return c != null && c.total > 0 && c.done >= c.total;
  };
  return (
    <View style={styles.row}>
      {STEPS.map((key, index) => {
        const c = key === 'review' ? null : progress[key];
        const done = isDone(key);
        const active = current === key;
        const first = index === 0;
        const last = index === STEPS.length - 1;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(`selfInspection.step.${key}`)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={styles.track}>
              <View style={[styles.line, first && styles.hidden, !first && isDone(STEPS[index - 1]) && styles.lineDone]} />
              <View style={[styles.circle, done && styles.circleDone, active && styles.circleActive]}>
                {done ? (
                  <Icon name="check" size={ms(13)} color={colors.white} strokeWidth={3} />
                ) : (
                  <AppText style={[styles.number, active && styles.numberActive]}>{index + 1}</AppText>
                )}
              </View>
              <View style={[styles.line, last && styles.hidden, done && styles.lineDone]} />
            </View>
            <AppText style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {t(`selfInspection.step.${key}`)}
            </AppText>
            <AppText style={[styles.count, done && styles.countDone]} numberOfLines={1}>
              {c ? `${c.done}/${c.total}` : estimateLabel}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const CIRCLE = ms(26);
const LINE = ms(2);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: ms(2),
  },
  pressed: {
    opacity: 0.7,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: spacing.xxs,
  },
  line: {
    flex: 1,
    height: LINE,
    backgroundColor: colors.border,
  },
  lineDone: {
    backgroundColor: colors.success,
  },
  hidden: {
    backgroundColor: 'transparent',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  circleDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  circleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  number: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.placeholder,
  },
  numberActive: {
    color: colors.white,
  },
  label: {
    fontFamily: fonts.subtitle.regular,
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.body,
  },
  labelActive: {
    fontFamily: fonts.title.semiBold,
    color: colors.primary,
  },
  count: {
    fontSize: fs(11),
    lineHeight: fs(14),
    color: colors.placeholder,
  },
  countDone: {
    color: colors.success,
  },
});

export default StepTabs;
