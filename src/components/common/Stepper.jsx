import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Icon from '../icons/Icon';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// Horizontal steps: Condition -> Verification -> Valuation
// Each column = [left line, dot, right line] + label, so labels stay under dots.
// Completed steps (index <= currentStep) are black with a white tick.
function Stepper({ steps, currentStep = 0, style }) {
  const last = steps.length - 1;

  return (
    <View style={[styles.container, style]}>
      {steps.map((label, i) => {
        const done = i <= currentStep;
        return (
          <View key={label} style={styles.step}>
            <View style={styles.track}>
              <View style={[styles.line, i === 0 && styles.hidden]} />
              <View style={[styles.dot, done && styles.dotDone]}>
                {done ? (
                  <Icon name="check" size={DOT * 0.6} color={colors.white} strokeWidth={3} />
                ) : null}
              </View>
              <View style={[styles.line, i === last && styles.hidden]} />
            </View>
            <AppText variant="caption" align="center" numberOfLines={1} style={styles.label}>
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const DOT = ms(20);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '85%',
  },
  step: {
    flex: 1,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.heading,
  },
  hidden: {
    opacity: 0,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.heading,
    backgroundColor: colors.white,
  },
  dotDone: {
    backgroundColor: colors.heading,
  },
  label: {
    marginTop: spacing.xs,
  },
});

export default Stepper;
