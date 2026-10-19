import { StyleSheet } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { formatTimer } from '../../../../utils/format';
import { useT } from '../../../../i18n';

// "Resend OTP (00:59)" - becomes tappable when the timer ends.
// disabled: a verify / resend is in flight, so the link is shown dimmed and
// not tappable (no competing actions while the app is busy).
function ResendOtp({ remaining, isDone, onResend, disabled = false }) {
  const t = useT();
  const canResend = isDone && !disabled;
  return (
    <AppText variant="subtitle" align="center" color={colors.heading} style={styles.text}>
      {isDone ? (
        <AppText
          variant="subtitle"
          color={canResend ? colors.primary : colors.placeholder}
          onPress={canResend ? onResend : undefined}
          suppressHighlighting={!canResend}
          style={canResend ? styles.link : null}
        >
          {t('auth.verify.resend')}
        </AppText>
      ) : (
        <>
          {t('auth.verify.resend')}{' '}
          <AppText variant="subtitle" color={colors.placeholder}>
            ({formatTimer(remaining)})
          </AppText>
        </>
      )}
    </AppText>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: spacing.md,
  },
  link: {
    textDecorationLine: 'underline',
  },
});

export default ResendOtp;
