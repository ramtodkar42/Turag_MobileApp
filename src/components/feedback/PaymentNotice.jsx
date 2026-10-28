import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Icon from '../icons/Icon';
import FadeIn from './FadeIn';
import { colors, radius, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// How each kind of unfinished payment looks: a calm card, never a red error.
const KINDS = {
  cancelled: { icon: 'close', fg: colors.body, bg: colors.input, titleKey: 'common.payNotice.cancelled' },
  declined: { icon: 'bank', fg: colors.warning, bg: colors.warningLight, titleKey: 'common.payNotice.declined' },
  network: { icon: 'globe', fg: colors.warning, bg: colors.warningLight, titleKey: 'common.payNotice.network' },
  unavailable: { icon: 'rupee', fg: colors.body, bg: colors.input, titleKey: 'common.payNotice.unavailable' },
  // Paid, but the server hasn't confirmed it yet.
  awaiting: { icon: 'clock', fg: colors.primary, bg: colors.input, titleKey: 'common.payNotice.awaiting' },
  failed: { icon: 'rupee', fg: colors.warning, bg: colors.warningLight, titleKey: 'common.payNotice.failed' },
};

// A payment that didn't finish (from api/razorpay paymentProblem): an icon, a
// short title and what to do next. problem: { kind, message } | null.
function PaymentNotice({ problem, style }) {
  const t = useT();
  if (!problem) {
    return null;
  }
  const look = KINDS[problem.kind] ?? KINDS.failed;
  return (
    <FadeIn offset={0} style={[styles.card, { backgroundColor: look.bg }, style]}>
      <View style={styles.icon}>
        <Icon name={look.icon} size={ms(18)} color={look.fg} />
      </View>
      <View style={styles.text} accessibilityLiveRegion="polite">
        <AppText variant="label" color={colors.heading}>
          {t(look.titleKey)}
        </AppText>
        {problem.message ? (
          <AppText variant="caption" color={colors.body} style={styles.message}>
            {problem.message}
          </AppText>
        ) : null}
      </View>
    </FadeIn>
  );
}

const ICON = ms(36);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  text: {
    flex: 1,
  },
  message: {
    marginTop: spacing.xxs,
  },
});

export default PaymentNotice;
