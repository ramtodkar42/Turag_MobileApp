import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, spacing } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';
import { fs, ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// Vertical progress list (inspection tracking, listing moderation).
// Steps up to `currentStep` are green.
// `link` ({ index, onPress }) makes one step blue and tappable once it's
// reached (e.g. "Inspector en route" opens the live map).
function StatusTimeline({ steps, currentStep = 0, link, style }) {
  const t = useT();
  const last = steps.length - 1;

  return (
    <View style={style}>
      {steps.map((label, i) => {
        const done = i <= currentStep;
        const isLink = link && link.index === i && done;
        const text = (
          <AppText
            variant="subtitle"
            color={isLink ? colors.info : colors.heading}
            style={[styles.label, isLink && styles.linkText]}
          >
            {label}
          </AppText>
        );

        return (
          <View key={label} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone]} />
              {i < last ? <View style={[styles.line, i < currentStep && styles.lineDone]} /> : null}
            </View>
            {isLink ? (
              <Pressable
                onPress={link.onPress}
                hitSlop={HIT_SLOP}
                accessibilityRole="link"
                accessibilityHint={t('common.opensLiveLocation')}
                style={styles.flex}
              >
                {text}
              </Pressable>
            ) : (
              text
            )}
          </View>
        );
      })}
    </View>
  );
}

const DOT = ms(10);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    width: DOT + 4,
    alignItems: 'center',
    paddingTop: ms(4),
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1,
    borderColor: colors.placeholder,
    backgroundColor: colors.white,
  },
  dotDone: {
    borderWidth: 2,
    borderColor: colors.successLight,
    backgroundColor: colors.success,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: colors.placeholder,
  },
  lineDone: {
    backgroundColor: colors.success,
  },
  flex: {
    flex: 1,
  },
  label: {
    flex: 1,
    paddingBottom: spacing.sm,
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});

export default StatusTimeline;
