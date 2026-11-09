import { StyleSheet, View } from 'react-native';
import { AppText, CheckCircle, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';

// How sending something turned out, said plainly: done (a green tick) or not done
// (a red mark, with what to do next).
// tone: 'success' | 'danger'. title: the outcome. text: one line more (optional).
function OutcomeBanner({ tone = 'success', title, text, style }) {
  const success = tone === 'success';
  return (
    <View
      style={[styles.box, success ? styles.success : styles.danger, style]}
      accessibilityRole={success ? 'summary' : 'alert'}
      accessibilityLiveRegion="polite"
    >
      {success ? (
        <CheckCircle size={MARK} />
      ) : (
        <View style={styles.mark}>
          <Icon name="alert" size={ms(14)} color={colors.white} strokeWidth={3} />
        </View>
      )}
      <View style={styles.flex}>
        <AppText variant="label" color={success ? colors.heading : colors.danger}>
          {title}
        </AppText>
        {text ? <AppText variant="caption" color={colors.body}>{text}</AppText> : null}
      </View>
    </View>
  );
}

const MARK = ms(24);

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  success: {
    backgroundColor: colors.successLight,
  },
  danger: {
    backgroundColor: colors.dangerLight,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  flex: {
    flex: 1,
    gap: spacing.xxs,
  },
});

export default OutcomeBanner;
