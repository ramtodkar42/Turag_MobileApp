import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { STEP_ICONS, STEPS } from '../constants';

// The four steps as one clean bar (like the app's Stepper): a round icon per
// step - red when it's the current one, a green tick when done - its name and
// "done/total" (Estimate shows the live estimate). Tap to open a step.
function StepTabs({ current, progress, estimateLabel, onSelect }) {
  const t = useT();
  return (
    <View style={styles.row}>
      {STEPS.map(key => {
        const c = key === 'review' ? null : progress[key];
        const done = c != null && c.total > 0 && c.done >= c.total;
        const active = current === key;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(`selfInspection.step.${key}`)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.circle, done && styles.circleDone, active && styles.circleActive]}>
              <Icon
                name={done ? 'check' : STEP_ICONS[key]}
                size={ms(17)}
                color={active ? colors.white : done ? colors.success : colors.muted}
                strokeWidth={done ? 2.6 : 1.9}
              />
            </View>
            <AppText style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {t(`selfInspection.step.${key}`)}
            </AppText>
            <AppText style={[styles.count, done && styles.countDone]} numberOfLines={1}>
              {c ? `${c.done}/${c.total}` : estimateLabel}
            </AppText>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const CIRCLE = ms(40);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: ms(3),
    paddingTop: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleDone: {
    backgroundColor: colors.successLight,
    borderColor: colors.successLight,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    marginTop: spacing.xxs,
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12.5),
    lineHeight: fs(17),
    color: colors.body,
  },
  labelActive: {
    fontFamily: fonts.title.bold,
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
  underline: {
    width: '60%',
    height: ms(3),
    marginTop: spacing.xs,
    borderRadius: ms(2),
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: colors.primary,
  },
});

export default StepTabs;
