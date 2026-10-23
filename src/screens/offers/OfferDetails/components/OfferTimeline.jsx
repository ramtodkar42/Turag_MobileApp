import { StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// A vertical progress line with a caption under each step (the web's offer
// timeline): done = filled tick, current = red ring, pending = grey ring.
// steps: [{ label, caption?, state: 'done' | 'current' | 'pending' }]
function OfferTimeline({ steps, style }) {
  return (
    <View style={style} accessibilityRole="list">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <View key={`${step.label}-${i}`} style={styles.step} accessibilityState={{ selected: step.state === 'current' }}>
            <View style={styles.rail}>
              <View style={[styles.dot, styles[step.state]]}>
                {step.state === 'done' ? (
                  <Icon name="check" size={ms(11)} color={colors.white} strokeWidth={3} />
                ) : (
                  <AppText style={[styles.num, step.state === 'current' && styles.numCurrent]}>{i + 1}</AppText>
                )}
              </View>
              {!last ? <View style={[styles.line, step.state === 'done' && styles.lineDone]} /> : null}
            </View>
            <View style={[styles.text, !last && styles.textGap]}>
              <AppText style={[styles.label, step.state === 'pending' && styles.labelPending]}>{step.label}</AppText>
              {step.caption ? <AppText variant="caption">{step.caption}</AppText> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = ms(24);

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  done: {
    backgroundColor: colors.heading,
    borderColor: colors.heading,
  },
  current: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
  },
  pending: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  num: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(11),
    lineHeight: fs(14),
    color: colors.placeholder,
  },
  numCurrent: {
    color: colors.primary,
  },
  line: {
    flex: 1,
    width: 2,
    minHeight: ms(14),
    backgroundColor: colors.border,
  },
  lineDone: {
    backgroundColor: colors.heading,
  },
  text: {
    flex: 1,
    paddingTop: ms(2),
  },
  textGap: {
    paddingBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13.5),
    lineHeight: fs(19),
    color: colors.heading,
  },
  labelPending: {
    color: colors.placeholder,
  },
});

export default OfferTimeline;
